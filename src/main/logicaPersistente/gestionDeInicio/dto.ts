import { z } from 'zod';

export const fondoInicioSchema = z.object({ id: z.number().int().positive() });
export type FondoInicioDTO = z.infer<typeof fondoInicioSchema>;