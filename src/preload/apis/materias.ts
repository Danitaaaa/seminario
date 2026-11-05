import { ipcRenderer } from 'electron';

export const materiasApi = {
  listarFormaciones: (datos: unknown) => ipcRenderer.invoke('materias:formaciones', datos),
  crearFormacion: (datos: unknown) => ipcRenderer.invoke('materias:crearFormacion', datos),
  modificarFormacion: (datos: unknown) => ipcRenderer.invoke('materias:modificarFormacion', datos),
  eliminarFormacion: (datos: unknown) => ipcRenderer.invoke('materias:eliminarFormacion', datos),
  listarMateriasFormacion: (datos: unknown) => ipcRenderer.invoke('materias:listar', datos),
  crearMaterias: (datos: unknown) => ipcRenderer.invoke('materias:crear', datos),
  modificarMateriaFormacion: (datos: unknown) => ipcRenderer.invoke('materias:modificar', datos),
  eliminarMateriaFormacion: (datos: unknown) => ipcRenderer.invoke('materias:eliminar', datos),
  listarMateriasUsuario: (datos: unknown) => ipcRenderer.invoke('materias:delUsuario', datos),
  listarCorrelativas: (datos: unknown) => ipcRenderer.invoke('materias:correlativas', datos),
  guardarCorrelativas: (datos: unknown) => ipcRenderer.invoke('materias:guardarCorrelativas', datos),
  leerPlanEstudios: (datos: unknown) => ipcRenderer.invoke('materias:leerPlan', datos),
};
