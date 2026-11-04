import { ipcMain } from 'electron';
import { Categorias } from '../administracionDePersistencia/categorias';

export function registerCategoriasIpc(categorias: Categorias): void {
  ipcMain.handle('categorias:listar', (_e, datos: unknown) => categorias.listar(datos as any));
  ipcMain.handle('categorias:crear', (_e, datos: unknown) => categorias.crear(datos as any));
  ipcMain.handle('categorias:modificar', (_e, datos: unknown) => categorias.modificar(datos as any));
  ipcMain.handle('categorias:eliminar', async (_e, datos: unknown) => {
    await categorias.eliminar(datos as any);
    return { ok: true };
  });
}