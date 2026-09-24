import { z } from 'zod';

export const iniciarSesionSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export type IniciarSesionDto = z.infer<typeof iniciarSesionSchema>;