import { ipcMain } from 'electron';
import { Horarios } from '../administracionDePersistencia/Horarios';
import {
  crearHorarioSchema,
  listarHorariosSchema,
  modificarHorarioSchema,
  eliminarHorarioSchema,
} from '../logicaPersistente/gestionDeHorarios/dto';

export function registerHorariosIpc(horarios: Horarios): void {
  ipcMain.handle('horarios:crear', async (_event, datos: unknown) => {
    const validado = crearHorarioSchema.parse(datos);
    return horarios.crear(validado);
  });

  ipcMain.handle('horarios:listar', async (_event, datos: unknown) => {
    const validado = listarHorariosSchema.parse(datos);
    return horarios.listar(validado);
  });

  ipcMain.handle('horarios:modificar', async (_event, datos: unknown) => {
    const validado = modificarHorarioSchema.parse(datos);
    return horarios.modificar(validado);
  });

  ipcMain.handle('horarios:eliminar', async (_event, datos: unknown) => {
    const validado = eliminarHorarioSchema.parse(datos);
    await horarios.eliminar(validado);
    return { ok: true };
  });
}
