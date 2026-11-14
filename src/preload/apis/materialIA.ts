// src/preload/apis/materialIA.ts
// Flashcards con IA, guía de preguntas y plan de estudios con IA.
// Tiene que sumarse al objeto que se expone en src/preload/index.ts: ...materialIAExtraApi
import { ipcRenderer } from 'electron';

export interface TarjetaIA {
  pregunta: string;
  respuesta: string;
  fuente: string | null;
}

export type RespuestaTarjetasIA =
  | { ok: true; trabajoId: string; nombreMazo: string; tarjetas: TarjetaIA[]; proveedores: string[] }
  | { ok: false; cancelado: true }
  | { ok: false; causa?: string; mensaje: string };

export type RespuestaGuiaIA =
  | { ok: true; trabajoId: string; nombreArchivo: string; totalPreguntas: number; html: string; proveedores: string[] }
  | { ok: false; cancelado: true }
  | { ok: false; causa?: string; mensaje: string };

export interface MateriaLeidaIA {
  nombre: string;
  anio: number | null;
  cuatrimestre: 'primero' | 'segundo' | 'anual' | null;
  correlativas: string[];
}

export type RespuestaPlanIA =
  | { ok: true; materias: MateriaLeidaIA[]; proveedores: string[] }
  | { ok: false; causa: string; mensaje: string };

// La IA pasa el archivo del plan (PDF, también escaneado) a texto siguiendo el prompt.
export type RespuestaTranscripcionIA =
  | { ok: true; nombre: string; texto: string; proveedores: string[] }
  | { ok: false; causa: string; mensaje: string };

export const materialIAExtraApi = {
  generarFlashcardsIA: (datos: {
    trabajoId: string;
    idArchivo: number;
    cantidad?: number;
    indicaciones?: string;
  }): Promise<RespuestaTarjetasIA> => ipcRenderer.invoke('flashcardsIA:generar', datos),

  generarGuiaPreguntas: (datos: {
    trabajoId: string;
    idArchivo: number;
    cantidad?: number;
    indicaciones?: string;
  }): Promise<RespuestaGuiaIA> => ipcRenderer.invoke('guiaPreguntas:generar', datos),

  guardarGuiaPreguntas: (datos: {
    trabajoId?: string;
    nombre: string;
    html: string;
    idPadre?: number;
  }): Promise<{ ok: true; archivo: { id: number; nombre: string } }> => ipcRenderer.invoke('guiaPreguntas:guardar', datos),

  descartarPropuestaIA: (datos: { trabajoId: string }): Promise<unknown> =>
    ipcRenderer.invoke('materialIAExtra:descartar', datos),

  leerPlanEstudiosIA: (datos: { trabajoId: string; texto: string }): Promise<RespuestaPlanIA> =>
    ipcRenderer.invoke('materias:leerPlanIA', datos),

  // Saca el texto de un archivo de plan (pdf, docx, txt, md) elegido por el usuario.
  extraerTextoPlan: (datos: { ruta: string }): Promise<{ nombre: string; texto: string }> =>
    ipcRenderer.invoke('materias:textoDePlan', datos),

  // Si la app no pudo leer el texto (PDF escaneado o foto), la IA lee las páginas como imágenes
  // (JPEG/PNG en base64) con el prompt indicado y devuelve el texto para el cuadro.
  transcribirPlanIA: (datos: { trabajoId: string; nombre?: string; prompt: string; imagenes: string[] }): Promise<RespuestaTranscripcionIA> =>
    ipcRenderer.invoke('materias:transcribirPlanIA', datos),
};

export type MaterialIAExtraApi = typeof materialIAExtraApi;