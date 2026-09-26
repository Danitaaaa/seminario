import { ipcRenderer } from 'electron';

export const nodosApi = {
    crearNodo: (datos: unknown) => ipcRenderer.invoke('nodos:crear', datos),
    modificarNodo: (datos: unknown) => ipcRenderer.invoke('nodos:modificar', datos),
    moverNodo: (datos: unknown) => ipcRenderer.invoke('nodos:mover', datos),
    listarContenido: (criterios: unknown) => ipcRenderer.invoke('nodos:listar', criterios),
    eliminarNodo: (datos: unknown) => ipcRenderer.invoke('nodos:eliminar', datos),
};