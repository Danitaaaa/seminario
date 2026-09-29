import { z } from "zod";

export interface CambiarPasswordDto {
    email: string;
    nuevaPassword: string;
}

export const iniciarSesionSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export type IniciarSesionDto = z.infer<typeof iniciarSesionSchema>;

export interface LoginFacialDto {
    embeddingFacial: string;
}

export interface RecuperarPasswordDto {
    email: string;
}

export interface RegistrarUsuarioDto {
    nombre: string;
    apellido: string;
    apodo: string;
    email: string;
    fechaNacimiento: Date;
    password: string;
}

export interface ValidarCodigoDto {
    email: string;
    codigo: string;
}

export const verificarMailSchema = z.object({
    email: z.email(),
    codigo: z.string().length(6),
});

export type VerificarMailDto = z.infer<typeof verificarMailSchema>;