import { z } from 'zod';

const idPositivo = z.number().int().positive();

// Usuario que realiza la acción (convención del proyecto: llega en el DTO desde el renderer).
export const usuarioIdSpotifySchema = z.object({ usuarioId: idPositivo });

// Datos para guardar o actualizar la cuenta vinculada.
export const guardarCuentaSpotifySchema = z.object({
  idUsuario: idPositivo,
  refreshToken: z.string().min(1),
  cifrado: z.boolean(),
  alcances: z.string(),
});
export type GuardarCuentaSpotifyDTO = z.infer<typeof guardarCuentaSpotifySchema>;

// Acciones de reproducción sobre un dispositivo opcional.
export const controlSpotifySchema = z.object({
  usuarioId: idPositivo,
  idDispositivo: z.string().min(1).max(100).optional(),
});

// Consultar si una pista está guardada en la biblioteca del usuario.
export const uriSpotifySchema = z.object({
  usuarioId: idPositivo,
  uri: z.string().regex(/^spotify:[a-z]+:[A-Za-z0-9]+$/),
});
