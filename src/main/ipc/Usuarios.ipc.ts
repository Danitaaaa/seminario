import { ipcMain } from "electron";

import { Usuarios } from "../administracionDePersistencia/Usuarios";

import {
    iniciarSesionSchema
} from "../logicaPersistente/gestionDeUsuarios/IniciarSesion.dto";

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
}