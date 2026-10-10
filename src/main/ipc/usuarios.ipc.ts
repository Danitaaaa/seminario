import { ipcMain } from "electron";
import { z } from "zod";

import { Usuarios } from "../administracionDePersistencia/usuarios";
import {
    cambiarPasswordSchema,
    iniciarSesionSchema,
    recuperarPasswordSchema,
    registrarUsuarioSchema,
    validarCodigoSchema,
    verificarMailSchema,
} from "../logicaPersistente/gestionDeUsuarios/dto";
import type { RegistrarUsuarioDto } from "../logicaPersistente/gestionDeUsuarios/dto";
import { LoginFacial } from "../logicaPersistente/gestionDeUsuarios/loginFacial";
import { RegistrarRostro } from "../logicaPersistente/gestionDeUsuarios/registrarRostro";

function validarDatos<T extends z.ZodType>(schema: T, datos: unknown): z.output<T> {
    const resultado = schema.safeParse(datos);
    if (!resultado.success) {
        throw new Error(resultado.error.issues[0]?.message ?? "Los datos ingresados no son válidos.");
    }
    return resultado.data;
}

export function registerUsuariosIpc(
    usuarios: Usuarios
): void {

    ipcMain.handle(
        "usuarios:iniciarSesion",
        async (_event, datos: unknown) => {

            return usuarios.iniciarSesion(validarDatos(iniciarSesionSchema, datos));
        }
    );

    ipcMain.handle(
        "usuarios:registrarUsuario",
        async (_event, datos: unknown) => {
            const validado = validarDatos(registrarUsuarioSchema, datos) as RegistrarUsuarioDto;
            return usuarios.registrarUsuario(validado);
        }
    );

    ipcMain.handle(
        "usuarios:verificarMail",
        async (_event, datos: unknown) => {
            const validado = validarDatos(verificarMailSchema, datos);
            return usuarios.verificarMail(validado.email, validado.codigo);
        }
    );

    ipcMain.handle(
        "usuarios:recuperarPassword",
        async (_event, datos: unknown) => {
            const validado = validarDatos(recuperarPasswordSchema, datos);
            return usuarios.recuperarPassword(validado.email);
        }
    );

    ipcMain.handle(
        "usuarios:cambiarPassword",
        async (_event, datos: unknown) => {
            const validado = validarDatos(cambiarPasswordSchema, datos);
            return usuarios.cambiarPassword(validado);
        }
    );

    ipcMain.handle(
        "usuarios:validarCodigo",
        async (_event, datos: unknown) => {
            const validado = validarDatos(validarCodigoSchema, datos);
            return usuarios.validarCodigo(validado);
        }
    );

    ipcMain.handle(
    'usuarios:registrarRostro',
    (_evento, usuarioId: number, embedding: number[]) =>
        new RegistrarRostro().ejecutar(usuarioId, embedding)
    );
    
    ipcMain.handle('usuarios:loginFacial', (_evento, embedding: number[]) =>
    new LoginFacial().ejecutar(embedding)
    );

}