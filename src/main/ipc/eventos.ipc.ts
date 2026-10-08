import { ipcMain } from 'electron';
import { Eventos } from '../administracionDePersistencia/Eventos';
import {
  crearEventoSchema,
  listarEventosSchema,
  modificarEventoSchema,
  eliminarEventoSchema,
} from '../logicaPersistente/gestionDeEventos/dto';

export function registerEventosIpc(eventos: Eventos): void {
  ipcMain.handle('eventos:crear', async (_event, datos: unknown) => {
    const validado = crearEventoSchema.parse(datos); // valida ANTES de tocar la base
    return eventos.crear(validado);
  });

  ipcMain.handle('eventos:listar', async (_event, datos: unknown) => {
    const validado = listarEventosSchema.parse(datos);
    return eventos.listar(validado);
  });

  ipcMain.handle('eventos:modificar', async (_event, datos: unknown) => {
    const validado = modificarEventoSchema.parse(datos);
    return eventos.modificar(validado);
  });

  ipcMain.handle('eventos:eliminar', async (_event, datos: unknown) => {
    const validado = eliminarEventoSchema.parse(datos);
    await eventos.eliminar(validado);
    return { ok: true };
  });
}
