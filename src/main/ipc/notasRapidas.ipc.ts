import { ipcMain } from 'electron';
import { NotasRapidas } from '../administracionDePersistencia/notasRapidas';
import { crearNotaSchema, eliminarNotaSchema, listarNotasSchema, modificarNotaSchema } from '../logicaPersistente/gestionDeNotasRapidas/dto';

export function registerNotasRapidasIpc(notas: NotasRapidas): void {
  ipcMain.handle('notasRapidas:listar', async (_e, datos: unknown) => notas.listar(listarNotasSchema.parse(datos)));
  ipcMain.handle('notasRapidas:crear', async (_e, datos: unknown) => notas.crear(crearNotaSchema.parse(datos)));
  ipcMain.handle('notasRapidas:modificar', async (_e, datos: unknown) => notas.modificar(modificarNotaSchema.parse(datos)));
  ipcMain.handle('notasRapidas:eliminar', async (_e, datos: unknown) => notas.eliminar(eliminarNotaSchema.parse(datos)));
}
