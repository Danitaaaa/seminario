import { ipcMain } from 'electron';
import { Metas } from '../administracionDePersistencia/metas';

export function registerMetasIpc(metas: Metas): void {
    ipcMain.handle('metas:listar', (_e, datos: unknown) => metas.listar(datos as any));
    ipcMain.handle('metas:crear', (_e, datos: unknown) => metas.crear(datos as any));
    ipcMain.handle('metas:modificar', (_e, datos: unknown) => metas.modificar(datos as any));
    ipcMain.handle('metas:alternar', (_e, datos: unknown) => metas.alternar(datos as any));
    ipcMain.handle('metas:eliminar', async (_e, datos: unknown) => {
        await metas.eliminar(datos as any);
        return { ok: true };
    });
    ipcMain.handle('metas:copiar', (_e, datos: unknown) => metas.copiar(datos as any));
    ipcMain.handle('metas:estadisticas', (_e, datos: unknown) => metas.estadisticas(datos as any));
}
