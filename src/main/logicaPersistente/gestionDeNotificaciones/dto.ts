import { z } from 'zod';

const idSchema = z.number().int().positive();

export const crearNotificacionSchema = z.object({
  usuarioId: idSchema,
  tipo: z.enum(['evento', 'meta', 'sesion', 'proyecto']),
  titulo: z.string().trim().min(1).max(120),
  mensaje: z.string().default(''),
  // Identifica el aviso: si ya existe uno con la misma clave, no se vuelve a crear.
  clave: z.string().min(1).max(200),
});
export type CrearNotificacionDTO = z.infer<typeof crearNotificacionSchema>;

export const usuarioSchema = z.object({ usuarioId: idSchema });
export type UsuarioDTO = z.infer<typeof usuarioSchema>;

export const marcarLeidasSchema = z.object({
  usuarioId: idSchema,
  // Sin ids se marcan todas.
  ids: z.array(idSchema).optional(),
});
export type MarcarLeidasDTO = z.infer<typeof marcarLeidasSchema>;

export const silenciarSchema = z.object({
  usuarioId: idSchema,
  silenciadas: z.boolean(),
});
export type SilenciarDTO = z.infer<typeof silenciarSchema>;