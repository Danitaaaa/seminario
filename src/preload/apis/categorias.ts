import { ipcRenderer } from 'electron';

export const categoriasApi = {
  listarCategorias: (datos: unknown) => ipcRenderer.invoke('categorias:listar', datos),
  crearCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:crear', datos),
  modificarCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:modificar', datos),
  eliminarCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:eliminar', datos),
};
