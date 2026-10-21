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
    loginFacial: (embedding: number[]) =>
        ipcRenderer.invoke('usuarios:loginFacial', embedding),
    registrarUsuario: (datos: unknown) =>
        ipcRenderer.invoke(
            "usuarios:registrarUsuario",
            datos
        ),
    registrarRostro: (usuarioId: number, embedding: number[]) =>
        ipcRenderer.invoke('usuarios:registrarRostro', usuarioId, embedding),
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
        ),
};