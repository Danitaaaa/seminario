import { ipcRenderer } from "electron";

export const usuariosApi = {
    iniciarSesion: (
        datos: unknown
    ) =>
        ipcRenderer.invoke(
            "usuarios:iniciarSesion",
            datos
        )
    ,
    registrarUsuario: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:registrarUsuario",
            datos
        ),
    verificarMail: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:verificarMail",
            datos
        ),

    recuperarPassword: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:recuperarPassword",
            datos
        ),
    
    validarCodigo: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:validarCodigo",
            datos
        ),
    
    cambiarPassword: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:cambiarPassword",
            datos
        )
};