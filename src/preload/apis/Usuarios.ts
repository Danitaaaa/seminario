import { ipcRenderer } from "electron";

export const usuariosApi = {
    iniciarSesion: (
        datos: unknown
    ) =>
        ipcRenderer.invoke(
            "usuarios:iniciarSesion",
            datos
        )
};