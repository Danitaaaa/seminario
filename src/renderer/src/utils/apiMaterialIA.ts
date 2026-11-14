// src/renderer/src/utils/apiMaterialIA.ts
// Acceso tipado a lo que suma materialIAExtra.preload.ts, sin tocar tu declaración global de window.api.
// (Si ya tipás window.api con `typeof` de tus APIs, podés borrar esto y usar window.api directo.)
import type { MaterialIAExtraApi } from '../../../preload/apis/materialIA';

type ApiConIA = MaterialIAExtraApi & {
  /** Es el `ia` de ia.preload.ts (si lo expusiste con otro nombre, cambialo acá). */
  ia: { cancelar: (idTrabajo: string) => Promise<boolean> };
  crearDeck: (datos: { usuarioId: number; nombre: string }) => Promise<{ idDeck?: number } | undefined>;
  listarDecks: (usuarioId: number) => Promise<Array<{ idDeck: number; nombre: string }>>;
  crearFlashcard: (datos: { usuarioId: number; deckId: number; pregunta: string; respuesta: string }) => Promise<unknown>;
};

export const apiIA = () => window.api;
export const api = apiIA; // alias, hasta unificar

export interface ArchivoMaterial {
  id: number;
  nombre: string;
  extension?: string;
  carpeta?: string;
}

/** Un trabajo de IA cancelable: el id viaja al main y es el mismo que usa la cola. */
export function nuevoTrabajoIA() {
  const id = crypto.randomUUID();
  // 'ia:cancelar' está en window.api.cancelar (iaApi se suma directo a window.api, no hay window.api.ia).
  // Antes se llamaba a api().ia.cancelar, que no existe: el error se tragaba y la generación seguía en el main.
  return { id, cancelar: () => Promise.resolve(window.api.cancelar(id)).catch(() => false) };
}
