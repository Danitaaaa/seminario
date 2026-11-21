// Lectura del plan de estudios con IA. Vive fuera de la pantalla para que siga aunque el usuario
// se vaya: mientras tanto se ve un cartel al costado (cartelLecturaPlan.tsx) y, al volver,
// la pantalla muestra el progreso o el resultado.
import { useSyncExternalStore } from 'react';
import { apiIA, nuevoTrabajoIA } from '../../utils/apiMaterialIA';
import { EXTENSIONES_IMAGEN, imagenesDePlan } from '../../utils/imagenesDePlan';
import { PROMPT_PLAN, mensajeDeError } from './utilidadesMaterias';
import type { PreguntaPlanIA } from '../../../../preload/apis/materialIA';

// Lo que se le mandó a la IA, para volver a pedírselo con las respuestas del usuario.
export interface PlanParaIA {
  nombre: string;
  imagenes?: string[];
  textoPlan?: string;
}

export type Respondida = { pregunta: string; respuesta: string };

export interface LecturaPlan {
  idFormacion: number;
  // leyendoArchivo: la app saca el texto o arma las imágenes; leyendoConIA: la IA trabaja; lista: hay resultado.
  fase: 'leyendoArchivo' | 'leyendoConIA' | 'lista';
  nombre: string;
  // Resultado (fase "lista"): el texto, las preguntas de la IA o un error.
  texto?: string;
  conIA?: boolean; // el texto lo ordenó la IA (si no, es el que sacó la app tal cual)
  preguntas?: PreguntaPlanIA[];
  respondidas?: Respondida[];
  plan?: PlanParaIA;
  error?: string;
}

let lectura: LecturaPlan | null = null;
let trabajo: ReturnType<typeof nuevoTrabajoIA> | null = null;
// Si la pantalla de carga del plan está abierta (con qué formación). Sin pantalla, se ve el cartel.
let pantalla: number | null = null;
const oyentes = new Set<() => void>();

function cambiar(nueva: LecturaPlan | null): void {
  lectura = nueva;
  oyentes.forEach((o) => o());
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

export const usarLecturaPlan = () => useSyncExternalStore(suscribir, () => lectura);
export const usarPantallaPlan = () => useSyncExternalStore(suscribir, () => pantalla);

export function marcarPantallaPlan(idFormacion: number | null): void {
  pantalla = idFormacion;
  oyentes.forEach((o) => o());
}

// La pantalla ya mostró el resultado.
export const olvidarLecturaPlan = () => cambiar(null);

export function cancelarLecturaPlan(): void {
  void trabajo?.cancelar();
}

// La IA pasa el plan a texto con el prompt de siempre. Si el plan tiene algo para elegir
// (por ejemplo, varias carreras), devuelve las preguntas y se espera la respuesta del usuario.
// Devuelve false si no hubo IA disponible (para seguir sin ella).
async function pedirAIA(idFormacion: number, plan: PlanParaIA, respondidas: Respondida[]): Promise<boolean> {
  cambiar({ idFormacion, fase: 'leyendoConIA', nombre: plan.nombre });
  trabajo = nuevoTrabajoIA();
  try {
    const r = await apiIA().transcribirPlanIA({
      trabajoId: trabajo.id, nombre: plan.nombre, prompt: PROMPT_PLAN,
      imagenes: plan.imagenes, textoPlan: plan.textoPlan, respuestas: respondidas,
    });
    if (!r.ok) {
      // Con texto sacado del archivo, si la IA no está o falla, el texto queda tal cual en el cuadro.
      if (plan.textoPlan) return false;
      if (r.causa === 'cancelado') cambiar(null);
      else cambiar({ idFormacion, fase: 'lista', nombre: plan.nombre, error: r.mensaje });
      return true;
    }
    if (r.preguntas.length) {
      cambiar({ idFormacion, fase: 'lista', nombre: plan.nombre, preguntas: r.preguntas, respondidas, plan });
    } else {
      cambiar({ idFormacion, fase: 'lista', nombre: plan.nombre, texto: r.texto, conIA: true });
    }
    return true;
  } finally {
    trabajo = null;
  }
}

// Carga del archivo:
//  1. La app saca el texto sola si puede (PDF con texto, Word) y se lo pasa a la IA para ordenarlo.
//     Si no hay ninguna IA disponible, el texto queda tal cual en el cuadro.
//  2. Si no hay texto (PDF escaneado o foto), la IA lee las páginas como imágenes.
//  3. Si la IA pregunta algo, se contesta y recién ahí aparece el texto.
export async function leerArchivoPlan(idFormacion: number, archivo: File): Promise<void> {
  cambiar({ idFormacion, fase: 'leyendoArchivo', nombre: archivo.name });
  try {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    const ruta = window.api.rutaDeArchivo(archivo);

    if (ruta && !EXTENSIONES_IMAGEN.includes(extension)) {
      let extraido: { nombre: string; texto: string } | null = null;
      try {
        extraido = await apiIA().extraerTextoPlan({ ruta });
      } catch {
        // Sin texto seleccionable: sigue con las imágenes.
      }
      if (extraido) {
        const conIA = await pedirAIA(idFormacion, { nombre: extraido.nombre, textoPlan: extraido.texto }, []);
        if (!conIA) cambiar({ idFormacion, fase: 'lista', nombre: extraido.nombre, texto: extraido.texto, conIA: false });
        return;
      }
    }

    cambiar({ idFormacion, fase: 'leyendoConIA', nombre: archivo.name });
    const imagenes = await imagenesDePlan(archivo);
    if (imagenes.length === 0) {
      return cambiar({
        idFormacion, fase: 'lista', nombre: archivo.name,
        error: 'No se pudo leer el archivo. Probá con un PDF, una foto del plan o pegá el texto a mano.',
      });
    }
    await pedirAIA(idFormacion, { nombre: archivo.name, imagenes }, []);
  } catch (e) {
    cambiar({ idFormacion, fase: 'lista', nombre: archivo.name, error: mensajeDeError(e, 'No se pudo leer el archivo.') });
  }
}

// El usuario contestó todas las preguntas: la IA vuelve a leer el plan con esas respuestas.
export async function responderPlan(idFormacion: number, plan: PlanParaIA, respondidas: Respondida[]): Promise<void> {
  try {
    await pedirAIA(idFormacion, plan, respondidas);
  } catch (e) {
    cambiar({ idFormacion, fase: 'lista', nombre: plan.nombre, error: mensajeDeError(e, 'No se pudo leer el archivo.') });
  }
}
