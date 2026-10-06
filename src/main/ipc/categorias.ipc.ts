import { ipcMain } from 'electron';
import { Categorias } from '../administracionDePersistencia/Categorias';
import {
  crearCategoriaSchema,
  listarCategoriasSchema,
  modificarCategoriaSchema,
  eliminarCategoriaSchema,
} from '../logicaPersistente/gestionDeCategorias/dto';

export function registerCategoriasIpc(categorias: Categorias): void {
  ipcMain.handle('categorias:crear', async (_e, datos: unknown) =>
    categorias.crear(crearCategoriaSchema.parse(datos))
  );
  ipcMain.handle('categorias:listar', async (_e, datos: unknown) =>
    categorias.listar(listarCategoriasSchema.parse(datos))
  );
  ipcMain.handle('categorias:modificar', async (_e, datos: unknown) =>
    categorias.modificar(modificarCategoriaSchema.parse(datos))
  );
  ipcMain.handle('categorias:eliminar', async (_e, datos: unknown) => {
    await categorias.eliminar(eliminarCategoriaSchema.parse(datos));
    return { ok: true };
  });
}
