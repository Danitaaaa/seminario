import { dialog, ipcMain } from "electron";
import { z } from "zod";

import { Usuarios } from "../administracionDePersistencia/Usuarios";
import {
    cambiarPasswordActualSchema,
    cambiarPasswordSchema,
    eliminarUsuarioSchema,
    iniciarSesionSchema,
    modificarPerfilSchema,
    obtenerPerfilSchema,
    recuperarPasswordSchema,
    registrarUsuarioSchema,
    validarCodigoSchema,
    verificarMailSchema,
} from "../logicaPersistente/gestionDeUsuarios/dto";
import type { RegistrarUsuarioDto } from "../logicaPersistente/gestionDeUsuarios/dto";
import { LoginFacial } from "../logicaPersistente/gestionDeUsuarios/LoginFacial";
import { RegistrarRostro } from "../logicaPersistente/gestionDeUsuarios/RegistrarRostro";

function validarDatos<T extends z.ZodType>(schema: T, datos: unknown): z.output<T> {
    const resultado = schema.safeParse(datos);
    if (!resultado.success) {
        throw new Error(resultado.error.issues[0]?.message ?? "Los datos ingresados no son válidos.");
    }
    return resultado.data;
}

export function registerUsuariosIpc(usuarios: Usuarios): void {

    ipcMain.handle("usuarios:iniciarSesion", async (_event, datos: unknown) =>
        usuarios.iniciarSesion(validarDatos(iniciarSesionSchema, datos))
    );

    ipcMain.handle("usuarios:registrarUsuario", async (_event, datos: unknown) => {
        const validado = validarDatos(registrarUsuarioSchema, datos) as RegistrarUsuarioDto;
        return usuarios.registrarUsuario(validado);
    });

    ipcMain.handle("usuarios:verificarMail", async (_event, datos: unknown) => {
        const validado = validarDatos(verificarMailSchema, datos);
        return usuarios.verificarMail(validado.email, validado.codigo);
    });

    ipcMain.handle("usuarios:recuperarPassword", async (_event, datos: unknown) => {
        const validado = validarDatos(recuperarPasswordSchema, datos);
        return usuarios.recuperarPassword(validado.email);
    });

    ipcMain.handle("usuarios:cambiarPassword", async (_event, datos: unknown) =>
        usuarios.cambiarPassword(validarDatos(cambiarPasswordSchema, datos))
    );

    ipcMain.handle("usuarios:validarCodigo", async (_event, datos: unknown) =>
        usuarios.validarCodigo(validarDatos(validarCodigoSchema, datos))
    );

    ipcMain.handle("usuarios:registrarRostro", (_evento, usuarioId: number, embedding: number[]) =>
        new RegistrarRostro().ejecutar(usuarioId, embedding)
    );

    ipcMain.handle("usuarios:loginFacial", (_evento, embedding: number[]) =>
        new LoginFacial().ejecutar(embedding)
    );

    // Gestion de perfil
    ipcMain.handle("usuarios:obtenerPerfil", async (_event, datos: unknown) =>
        usuarios.obtenerPerfil(validarDatos(obtenerPerfilSchema, datos))
    );

    ipcMain.handle("usuarios:modificarPerfil", async (_event, datos: unknown) =>
        usuarios.modificarPerfil(validarDatos(modificarPerfilSchema, datos))
    );

    ipcMain.handle("usuarios:cambiarPasswordActual", async (_event, datos: unknown) =>
        usuarios.cambiarPasswordActual(validarDatos(cambiarPasswordActualSchema, datos))
    );

    ipcMain.handle("usuarios:eliminarUsuario", async (_event, datos: unknown) =>
        usuarios.eliminarUsuario(validarDatos(eliminarUsuarioSchema, datos))
    );

    ipcMain.handle("usuarios:obtenerFotoPerfil", async (_event, datos: unknown) => {
        const { id } = validarDatos(obtenerPerfilSchema, datos);
        return usuarios.obtenerFotoPerfil(id);
    });

    // El diálogo se abre acá: el renderer nunca recibe rutas del disco.
    ipcMain.handle("usuarios:elegirFotoPerfil", async (_event, datos: unknown) => {
        const { id } = validarDatos(obtenerPerfilSchema, datos);
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: "Elegir foto de perfil",
            properties: ["openFile"],
            filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp"] }],
        });
        if (canceled || filePaths.length === 0) return null;
        return usuarios.actualizarFotoPerfil(id, filePaths[0]);
    });
}