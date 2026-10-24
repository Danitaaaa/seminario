import { ipcRenderer } from 'electron';

export const metasApi = {
  listarMetas: (datos: unknown) => ipcRenderer.invoke('metas:listar', datos),
  crearMeta: (datos: unknown) => ipcRenderer.invoke('metas:crear', datos),
  completarMeta: (datos: unknown) => ipcRenderer.invoke('metas:completar', datos),
  eliminarMeta: (datos: unknown) => ipcRenderer.invoke('metas:eliminar', datos),
};