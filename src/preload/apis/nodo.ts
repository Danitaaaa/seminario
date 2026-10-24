import { ipcRenderer } from 'electron';

export const nodosApi = {
    listarContenido: (criterios: unknown) => ipcRenderer.invoke('nodos:listar', criterios),
    crearNodo: (datos: unknown) => ipcRenderer.invoke('nodos:crear', datos),
    modificarNodo: (datos: unknown) => ipcRenderer.invoke('nodos:modificar', datos),
    moverNodo: (datos: unknown) => ipcRenderer.invoke('nodos:mover', datos),
    eliminarNodo: (datos: unknown) => ipcRenderer.invoke('nodos:eliminar', datos),
}; 