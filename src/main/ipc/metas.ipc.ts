import { ipcMain } from 'electron';
import { ZodError } from 'zod';
import { Metas } from '../administracionDePersistencia/metas';

// Los casos de uso validan con Zod: acá se deja solo el primer mensaje legible (ej. "Escribí la meta.").
async function conMensaje<T>(accion: () => Promise<T>): Promise<T> {
    try {
        return await accion();
    } catch (error) {
        if (error instanceof ZodError) throw new Error(error.issues[0]?.message ?? 'Datos inválidos.');
        throw error;
    }
}

export function registerMetasIpc(metas: Metas): void {
    ipcMain.handle('metas:listar', (_e, datos: unknown) => conMensaje(() => metas.listar(datos as any)));
    ipcMain.handle('metas:crear', (_e, datos: unknown) => conMensaje(() => metas.crear(datos as any)));
    ipcMain.handle('metas:modificar', (_e, datos: unknown) => conMensaje(() => metas.modificar(datos as any)));
    ipcMain.handle('metas:alternar', (_e, datos: unknown) => conMensaje(() => metas.alternar(datos as any)));
    ipcMain.handle('metas:eliminar', (_e, datos: unknown) => conMensaje(async () => {
        await metas.eliminar(datos as any);
        return { ok: true };
    }));
    ipcMain.handle('metas:copiar', (_e, datos: unknown) => conMensaje(() => metas.copiar(datos as any)));
    ipcMain.handle('metas:estadisticas', (_e, datos: unknown) => conMensaje(() => metas.estadisticas(datos as any)));
}