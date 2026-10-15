import { ipcRenderer } from "electron";

export const usuariosApi = {
    iniciarSesion: (datos: unknown) => ipcRenderer.invoke("usuarios:iniciarSesion", datos),
    registrarUsuario: (datos: unknown) => ipcRenderer.invoke("usuarios:registrarUsuario", datos),
    verificarMail: (datos: unknown) => ipcRenderer.invoke("usuarios:verificarMail", datos),
    recuperarPassword: (datos: unknown) => ipcRenderer.invoke("usuarios:recuperarPassword", datos),
    validarCodigo: (datos: unknown) => ipcRenderer.invoke("usuarios:validarCodigo", datos),
    cambiarPassword: (datos: unknown) => ipcRenderer.invoke("usuarios:cambiarPassword", datos),

    registrarRostro: (usuarioId: number, embedding: number[]) =>
        ipcRenderer.invoke("usuarios:registrarRostro", usuarioId, embedding),
    loginFacial: (embedding: number[]) => ipcRenderer.invoke("usuarios:loginFacial", embedding),

    // Gestion de perfil
    obtenerPerfil: (datos: unknown) => ipcRenderer.invoke("usuarios:obtenerPerfil", datos),
    modificarPerfil: (datos: unknown) => ipcRenderer.invoke("usuarios:modificarPerfil", datos),
    cambiarPasswordActual: (datos: unknown) => ipcRenderer.invoke("usuarios:cambiarPasswordActual", datos),
    eliminarUsuario: (datos: unknown) => ipcRenderer.invoke("usuarios:eliminarUsuario", datos),
    obtenerFotoPerfil: (datos: unknown) => ipcRenderer.invoke("usuarios:obtenerFotoPerfil", datos),
    actualizarFotoPerfil: (datos: unknown) => ipcRenderer.invoke("usuarios:actualizarFotoPerfil", datos),
};