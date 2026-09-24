import { z } from "zod";

export const verificarMailSchema =
    z.object({
        email: z.email(),
        codigo: z
            .string()
            .length(6)
    });

export type VerificarMailDto =
    z.infer<
        typeof verificarMailSchema
    >;