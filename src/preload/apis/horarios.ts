import { ipcRenderer } from 'electron';

export const horariosApi = {
  crearHorario: (datos: unknown) => ipcRenderer.invoke('horarios:crear', datos),
  listarHorarios: (datos: unknown) => ipcRenderer.invoke('horarios:listar', datos),
  modificarHorario: (datos: unknown) => ipcRenderer.invoke('horarios:modificar', datos),
  eliminarHorario: (datos: unknown) => ipcRenderer.invoke('horarios:eliminar', datos),
};
