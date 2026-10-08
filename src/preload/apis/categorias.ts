import { ipcRenderer } from 'electron';

export const categoriasApi = {
  crearCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:crear', datos),
  listarCategorias: (datos: unknown) => ipcRenderer.invoke('categorias:listar', datos),
  modificarCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:modificar', datos),
  eliminarCategoria: (datos: unknown) => ipcRenderer.invoke('categorias:eliminar', datos),
};
