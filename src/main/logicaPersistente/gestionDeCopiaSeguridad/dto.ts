import { z } from 'zod';

// Validación de lo que manda la pantalla de copia de seguridad.
const password = z.string().min(1, 'Escribí tu contraseña.').max(200);

export const configurarCopiaSchema = z.object({ automatica: z.boolean() });

export const hacerCopiaSchema = z.object({ password: password.optional() });

export const restaurarCopiaSchema = z.object({
  origen: z.union([z.object({ drive: z.string().min(1).max(200) }), z.object({ archivo: z.literal(true) })]),
  password,
  desdeInicio: z.boolean(),
});
