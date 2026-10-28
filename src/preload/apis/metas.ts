import { ipcRenderer } from 'electron';

export const metasApi = {
  listarMetas: (datos: unknown) => ipcRenderer.invoke('metas:listar', datos),
  crearMeta: (datos: unknown) => ipcRenderer.invoke('metas:crear', datos),
  modificarMeta: (datos: unknown) => ipcRenderer.invoke('metas:modificar', datos),
  alternarMeta: (datos: unknown) => ipcRenderer.invoke('metas:alternar', datos),
  eliminarMeta: (datos: unknown) => ipcRenderer.invoke('metas:eliminar', datos),
  copiarMetas: (datos: unknown) => ipcRenderer.invoke('metas:copiar', datos),
  estadisticasMetas: (datos: unknown) => ipcRenderer.invoke('metas:estadisticas', datos),
};