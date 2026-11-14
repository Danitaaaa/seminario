import { z } from 'zod';

const id = z.number().int().positive('El usuario no es válido.');

export const usuarioBienestarSchema = z.object({ usuarioId: id });
export type UsuarioBienestarDTO = z.infer<typeof usuarioBienestarSchema>;

export const cambiarBienestarSchema = z.object({ usuarioId: id, activo: z.boolean() });
export type CambiarBienestarDTO = z.infer<typeof cambiarBienestarSchema>;
