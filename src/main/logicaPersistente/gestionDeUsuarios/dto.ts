import { z } from "zod";

const campoObligatorioSchema = z.string().min(1, "Este campo es obligatorio.");

const nombreSchema = campoObligatorioSchema.regex(
    /^\p{L}{2,}( \p{L}{2,})*$/u,
    "Cada palabra debe tener al menos dos letras; use solo letras y espacios."
);

const emailSchema = campoObligatorioSchema.pipe(
    z.email({ error: "Ingresá un email válido." })
);

export const passwordSchema = campoObligatorioSchema
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/\p{Lu}/u, "La contraseña debe incluir al menos una mayúscula.")
    .regex(/[0-9]/, "La contraseña debe incluir al menos un número.")
    .regex(/[\p{P}\p{S}]/u, "La contraseña debe incluir al menos un carácter especial.");

function edadPermitida(fechaNacimiento: Date): boolean {
    const hoy = new Date();
    let edad = hoy.getUTCFullYear() - fechaNacimiento.getUTCFullYear();

    if (
        hoy.getUTCMonth() < fechaNacimiento.getUTCMonth() ||
        (hoy.getUTCMonth() === fechaNacimiento.getUTCMonth() &&
            hoy.getUTCDate() < fechaNacimiento.getUTCDate())
    ) {
        edad--;
    }

    return edad >= 16 && edad <= 80;
}

export const iniciarSesionSchema = z.object({
    email: emailSchema,
    password: campoObligatorioSchema,
});

export const registrarUsuarioSchema = z.object({
    nombre: nombreSchema,
    apellido: nombreSchema,
    apodo: nombreSchema,
    email: emailSchema,
    fechaNacimiento: z.date({ error: "La fecha de nacimiento es obligatoria." }).refine(edadPermitida, {
        message: "La edad debe estar entre 16 y 80 años.",
    }),
    password: passwordSchema,
    confirmPassword: campoObligatorioSchema,
}).refine(datos => datos.password === datos.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
}).transform(({ confirmPassword, ...usuario }) => usuario);

export const cambiarPasswordSchema = z.object({
    email: emailSchema,
    nuevaPassword: passwordSchema,
});

export const verificarMailSchema = z.object({
    email: emailSchema,
    codigo: campoObligatorioSchema.length(6, "El código debe tener 6 caracteres."),
});

export const recuperarPasswordSchema = z.object({
    email: emailSchema,
});

export const validarCodigoSchema = z.object({
    email: emailSchema,
    codigo: campoObligatorioSchema.length(6, "El código debe tener 6 caracteres."),
});

export interface CambiarPasswordDto {
    email: string;
    nuevaPassword: string;
}

export interface IniciarSesionDto {
    email: string;
    password: string;
}

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

export interface VerificarMailDto {
    email: string;
    codigo: string;
}