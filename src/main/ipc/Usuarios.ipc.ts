import { ipcMain } from "electron";

import { Usuarios } from "../administracionDePersistencia/Usuarios";

import {iniciarSesionSchema} from "../logicaPersistente/gestionDeUsuarios/dto/IniciarSesion.dto";
import { RegistrarUsuarioDto } from "../logicaPersistente/gestionDeUsuarios/dto/RegistrarUsuario.dto";
import { verificarMailSchema } from "../logicaPersistente/gestionDeUsuarios/dto/VerificarMail.dto";
import { CambiarPasswordDto } from "../logicaPersistente/gestionDeUsuarios/dto/CambiarPassword.dto";
import { ValidarCodigoDto } from "../logicaPersistente/gestionDeUsuarios/dto/ValidarCodigo.dto";

export function registerUsuariosIpc(
    usuarios: Usuarios
): void {

    ipcMain.handle(
        "usuarios:iniciarSesion",
        async (_event, datos: unknown) => {

            const validado =
                iniciarSesionSchema.parse(
                    datos
                );

            return usuarios.iniciarSesion(
                validado
            );
        }
    );

    ipcMain.handle(
        "usuarios:registrarUsuario",
        async (_event, datos: RegistrarUsuarioDto) => {
            return usuarios.registrarUsuario(datos);
        }
    );

    ipcMain.handle(
        "usuarios:verificarMail",
        async (_event, datos: unknown) => {
            const validado = verificarMailSchema.parse(datos);
            return usuarios.verificarMail(validado.email, validado.codigo);
        }
    );

    ipcMain.handle(
        "usuarios:recuperarPassword",
        async (_event, datos: unknown) => {
            const email = typeof datos === "object" && datos !== null && "email" in datos
                ? String((datos as { email?: unknown }).email ?? "")
                : "";

            if (!email) {
                throw new Error("El email es obligatorio.");
            }

            return usuarios.recuperarPassword(email);
        }
    );

    ipcMain.handle(
        "usuarios:cambiarPassword",
        async (_event, datos: unknown) => {
            const { email, nuevaPassword } = typeof datos === "object" && datos !== null
                ? (datos as { email?: unknown; nuevaPassword?: unknown })
                : {};

            if (!email || !nuevaPassword) {
                throw new Error("El email y la nueva contraseña son obligatorios.");
            }

            return usuarios.cambiarPassword({
                email: String(email),
                nuevaPassword: String(nuevaPassword),
            });
        }
    );

    ipcMain.handle(
        "usuarios:validarCodigo",
        async (_event, datos: unknown) => {
            const { email, codigo } = typeof datos === "object" && datos !== null
                ? (datos as { email?: unknown; codigo?: unknown })
                : {};

            if (!email || !codigo) {
                throw new Error("El email y el código son obligatorios.");
            }

            return usuarios.validarCodigo({
                email: String(email),
                codigo: String(codigo),
            });
        }
    );
}