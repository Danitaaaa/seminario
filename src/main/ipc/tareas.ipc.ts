import { ipcMain } from 'electron';
import { Tareas } from '../administracionDePersistencia/tareas';

export function registerTareasIpc(tareas: Tareas): void {
    ipcMain.handle('tareas:listar', (_e, datos: unknown) => tareas.listar(datos as any));
    ipcMain.handle('tareas:crear', (_e, datos: unknown) => tareas.crear(datos as any));
    ipcMain.handle('tareas:modificar', (_e, datos: unknown) => tareas.modificar(datos as any));
    ipcMain.handle('tareas:alternar', (_e, datos: unknown) => tareas.alternar(datos as any));
    ipcMain.handle('tareas:asignar', (_e, datos: unknown) => tareas.asignar(datos as any));
    ipcMain.handle('tareas:repartir', (_e, datos: unknown) => tareas.repartir(datos as any));
    ipcMain.handle('tareas:eliminar', async (_e, datos: unknown) => {
        await tareas.eliminar(datos as any);
        return { ok: true };
    });
}
