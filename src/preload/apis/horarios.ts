import { ipcRenderer } from 'electron';

export const horariosApi = {
  listarHorarios: (datos: unknown) => ipcRenderer.invoke('horarios:listar', datos),
  crearHorario: (datos: unknown) => ipcRenderer.invoke('horarios:crear', datos),
  modificarHorario: (datos: unknown) => ipcRenderer.invoke('horarios:modificar', datos),
  asignarCuatrimestreHorarios: (datos: unknown) => ipcRenderer.invoke('horarios:asignarCuatrimestre', datos),
  eliminarHorario: (datos: unknown) => ipcRenderer.invoke('horarios:eliminar', datos),
};
