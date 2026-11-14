// src/main/logicaNoPersistente/ia/dto.ts
// Contrato de la IA hacia afuera: esquemas zod de lo que llega del renderer (DESCONFIABLE, se valida igual que la
// salida del modelo) y los tipos de lo que se le devuelve. El IPC valida con estos esquemas; el preload usa los tipos.
import { z } from 'zod';
import { NOMBRES_TAREAS } from './tareas.js';

export type { TareaImplementada } from './tareas.js';
export type { EventoOllama } from '../../servicios/ia/gestorOllama.js';

export const generarSchema = z.object({
  idTrabajo: z.string().uuid(),
  tarea: z.enum(NOMBRES_TAREAS),
  texto: z.string().min(1).max(2_000_000), // ya extraído (mammoth / pdf) y validado antes
  preferencias: z.string().max(2000).optional(),
});
export type GenerarDTO = z.infer<typeof generarSchema>;

/** Proveedores que usan clave (Gemma es local: no tiene). */
export const proveedorOnlineSchema = z.enum(['luna', 'gemini']);
export type ProveedorOnline = z.infer<typeof proveedorOnlineSchema>;

export const proveedorCualquieraSchema = z.enum(['luna', 'gemini', 'gemma']);
export type ProveedorCualquiera = z.infer<typeof proveedorCualquieraSchema>;

export const guardarClaveSchema = z.object({
  proveedor: proveedorOnlineSchema,
  clave: z.string().min(8).max(300),
});
export type GuardarClaveDTO = z.infer<typeof guardarClaveSchema>;

export const idTrabajoSchema = z.string();

/** Los Error NO viajan bien por IPC (se pierden propiedades): siempre se devuelve un objeto simple. */
export type RespuestaIA<T> = { ok: true; dato: T } | { ok: false; causa: string; mensaje: string };

export interface ResultadoIA<T> {
  contenido: T; // el resultado ya combinado y validado
  proveedores: string[]; // quién respondió: ['gemini'], ['gemma'], ['gemini', 'gemma']...
}

export const fallo = (causa: string, e: unknown): RespuestaIA<never> => ({
  ok: false,
  causa,
  mensaje: e instanceof Error ? e.message : String(e),
});
