// src/main/ipc/planArchivo.ipc.ts
// Cargar el plan de estudios desde un archivo:
//  1. 'materias:textoDePlan': la app intenta sacar el texto sola (PDF con texto, Word, txt, md).
//  2. Si no puede (PDF escaneado o foto), 'materias:transcribirPlanIA': la pantalla manda las páginas como
//     imágenes y la IA disponible (GptMini → Gemma) las pasa a texto con el formato que entiende "Leer plan".
import { ipcMain } from 'electron';
import { stat } from 'node:fs/promises';
import { basename, extname, isAbsolute } from 'node:path';
import { z } from 'zod';
import { extraerTexto } from '../logicaNoPersistente/ia/extractorTexto.js';
import type { ColaEjecucion } from '../logicaNoPersistente/ia/colaEjecucion.js';
import type { RouterModelos } from '../logicaNoPersistente/ia/routerModelos.js';
import { ErrorRouter, esAbort } from '../logicaNoPersistente/ia/errores.js';
import { TAREAS_IA } from '../logicaNoPersistente/ia/tareas.js';
import { transcripcionPlanSchema } from '../logicaNoPersistente/ia/esquemas/index.js';

const EXTENSIONES = new Set(['pdf', 'docx', 'txt', 'md']);
const TAMANIO_MAXIMO = 25 * 1024 * 1024; // 25 MB
const MAX_PAGINAS = 12;
const MAX_IMAGEN = 6 * 1024 * 1024; // caracteres de base64 por página (~4,5 MB)

const pedidoSchema = z.object({ ruta: z.string().min(1).max(1000) });
const pedidoIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  nombre: z.string().trim().max(300).optional(),
  prompt: z.string().min(1).max(20000),
  // Páginas del plan como JPEG/PNG en base64 (sin "data:..."), ya armadas por la pantalla.
  imagenes: z
    .array(z.string().min(100).max(MAX_IMAGEN).regex(/^[A-Za-z0-9+/=]+$/, { error: 'Imagen inválida.' }))
    .min(1, { error: 'No llegó ninguna página del plan.' })
    .max(MAX_PAGINAS, { error: `Como máximo ${MAX_PAGINAS} páginas.` }),
});

async function validarArchivo(ruta: string): Promise<string> {
  if (!isAbsolute(ruta)) throw new Error('No se pudo leer el archivo elegido.');
  const extension = extname(ruta).slice(1).toLowerCase();
  if (!EXTENSIONES.has(extension)) {
    throw new Error('Formato no soportado. Usá un PDF, un Word (.docx) o un texto (.txt).');
  }
  const info = await stat(ruta);
  if (!info.isFile() || info.size > TAMANIO_MAXIMO) {
    throw new Error('El archivo no es válido o pesa más de 25 MB.');
  }
  return extension;
}

export function registrarIpcPlanArchivo(router: RouterModelos, cola: ColaEjecucion): void {
  // 1. Sin IA. Si no hay texto (escaneo), da error y la pantalla pasa a la IA.
  ipcMain.handle('materias:textoDePlan', async (_e, datos: unknown) => {
    const { ruta } = pedidoSchema.parse(datos);
    const extension = await validarArchivo(ruta);
    let texto = '';
    try {
      texto = (await extraerTexto(ruta, extension)).texto;
    } catch {
      texto = '';
    }
    if (!texto.trim()) throw new Error('El archivo no tiene texto seleccionable (¿es un PDF escaneado?).');
    return { nombre: basename(ruta), texto };
  });

  // 2. Con IA: lee las imágenes de las páginas. Usa la misma cola que toda la IA (se cancela con 'ia:cancelar').
  ipcMain.handle('materias:transcribirPlanIA', async (_e, datos: unknown) => {
    const validado = pedidoIASchema.safeParse(datos);
    if (!validado.success) {
      return { ok: false, causa: 'pedido_invalido', mensaje: validado.error.issues[0]?.message ?? 'Pedido inválido.' };
    }
    const { trabajoId, nombre, prompt, imagenes } = validado.data;
    try {
      const r = await cola.add(trabajoId, (ctx) =>
        router.generar('transcripcionPlan', {
          sistema: TAREAS_IA.transcripcionPlan.sistema,
          usuario: prompt,
          esquema: transcripcionPlanSchema,
          esquemaJson: TAREAS_IA.transcripcionPlan.esquemaJson,
          imagenes,
          signal: ctx.signal,
        }),
      );
      const texto = r.dato.texto.trim();
      if (!texto) {
        return { ok: false, causa: 'sin_contenido_valido', mensaje: 'La IA no encontró materias en el archivo. Probá con una imagen más nítida.' };
      }
      return { ok: true, nombre: nombre ?? 'Plan de estudios', texto, proveedores: [r.proveedor] };
    } catch (e) {
      if (esAbort(e)) return { ok: false, causa: 'cancelado', mensaje: 'Cancelado' };
      if (e instanceof ErrorRouter) {
        return {
          ok: false,
          causa: 'sin_proveedor',
          mensaje: 'Ninguna IA pudo leer el plan ahora (sin internet, sin clave o Ollama apagado). Probá más tarde o pegá el texto a mano.',
        };
      }
      return { ok: false, causa: 'ia', mensaje: e instanceof Error ? e.message : 'Falló la lectura con IA.' };
    }
  });
}
