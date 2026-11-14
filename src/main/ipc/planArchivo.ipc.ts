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
const MAX_RESPUESTAS = 8; // después de tantas respuestas, la IA tiene que transcribir sí o sí
// Leer un plan escaneado de muchas páginas tarda más que una pregunta del chat.
const TIEMPO_MAXIMO_MS = 4 * 60 * 1000;

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const pedidoSchema = z.object({ ruta: z.string().min(1).max(1000) });
const pedidoIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  nombre: z.string().trim().max(300).optional(),
  prompt: z.string().min(1).max(20000),
  // Páginas del plan como JPEG/PNG en base64 (sin "data:..."), ya armadas por la pantalla (PDF escaneado o foto).
  imagenes: z
    .array(z.string().min(100).max(MAX_IMAGEN).regex(/^[A-Za-z0-9+/=]+$/, { error: 'Imagen inválida.' }))
    .max(MAX_PAGINAS, { error: `Como máximo ${MAX_PAGINAS} páginas.` })
    .default([]),
  // O el texto que la app ya sacó del archivo (PDF con texto, Word).
  textoPlan: z.string().max(200_000).optional(),
  // Lo que el usuario contestó a las preguntas de la IA (segunda vuelta).
  // Puede haber varias vueltas (como en un chat): primero la carrera, después la orientación…
  respuestas: z.array(z.object({ pregunta: z.string().max(300), respuesta: z.string().max(300) })).max(MAX_RESPUESTAS).default([]),
}).refine((d) => d.imagenes.length > 0 || !!d.textoPlan?.trim(), { error: 'No llegó el plan (ni páginas ni texto).' });

// El pedido para la IA: el prompt de siempre, el texto del plan (si lo hay) y las respuestas del usuario.
// `forzar`: segundo intento cuando la IA no devolvió el plan aunque ya estaba todo respondido.
function armarPedido(
  prompt: string,
  textoPlan: string | undefined,
  respuestas: { pregunta: string; respuesta: string }[],
  forzar = false,
): string {
  const partes = [prompt];
  if (textoPlan?.trim()) partes.push(`<<<PLAN>>>\n${textoPlan.replace(/<<<|>>>/g, '')}\n<<<FIN_PLAN>>>`);
  if (respuestas.length) {
    partes.push(
      `<<<RESPUESTAS>>>\nYa te respondí esto (no lo vuelvas a preguntar):\n` +
        `${respuestas.map((r) => `- ${r.pregunta} → ${r.respuesta}`).join('\n')}\n` +
        'Pasá solo las materias comunes y las de lo que elegí.\n<<<FIN_RESPUESTAS>>>',
    );
  }
  if (forzar) {
    partes.push('IMPORTANTE: ya no hagas ninguna pregunta. Devolvé "preguntas" vacío y el plan completo en "texto", con lo que elegí.');
  }
  return partes.join('\n\n');
}

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
    const { trabajoId, nombre, prompt, imagenes, textoPlan, respuestas } = validado.data;
    try {
      const pedir = (forzar: boolean) =>
        cola.add(trabajoId, (ctx) =>
          router.generar('transcripcionPlan', {
            sistema: TAREAS_IA.transcripcionPlan.sistema,
            usuario: armarPedido(prompt, textoPlan, respuestas, forzar),
            esquema: transcripcionPlanSchema,
            esquemaJson: TAREAS_IA.transcripcionPlan.esquemaJson,
            ...(imagenes.length ? { imagenes } : {}),
            timeoutMs: TIEMPO_MAXIMO_MS,
            signal: ctx.signal,
          }),
        );
      let r = await pedir(false);
      console.log('[plan-ia] respuesta:', { preguntas: r.dato.preguntas.map((p) => p.pregunta), caracteres: r.dato.texto.length, respondidas: respuestas.length });
      // Si la IA todavía necesita que el usuario elija algo (por ejemplo, la orientación después de la carrera),
      // devuelve esas preguntas. Las que ya respondió no se repiten y hay un tope para no preguntar para siempre.
      const yaRespondidas = new Set(respuestas.map((x) => normalizar(x.pregunta)));
      const preguntas = respuestas.length >= MAX_RESPUESTAS
        ? []
        : r.dato.preguntas.filter((p) => p.opciones.length >= 2 && !yaRespondidas.has(normalizar(p.pregunta)));
      if (preguntas.length) {
        return { ok: true, nombre: nombre ?? 'Plan de estudios', preguntas, texto: '', proveedores: [r.proveedor] };
      }
      // Ya respondió todo pero la IA no pasó el plan (por ejemplo, repitió una pregunta): se le pide una vez más, sin preguntas.
      if (!r.dato.texto.trim() && respuestas.length) {
        r = await pedir(true);
        console.log('[plan-ia] segundo intento:', { caracteres: r.dato.texto.length });
      }
      const texto = r.dato.texto.trim();
      if (!texto) {
        return { ok: false, causa: 'sin_contenido_valido', mensaje: 'La IA no encontró materias en el archivo. Probá con una imagen más nítida.' };
      }
      return { ok: true, nombre: nombre ?? 'Plan de estudios', preguntas: [], texto, proveedores: [r.proveedor] };
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
