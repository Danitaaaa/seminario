import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Cuadernos } from '../administracionDePersistencia/cuadernos';
import {
  crearNotaSchema, cuadernoSchema, modificarNotaSchema, notaSchema, usuarioSchema,
} from '../logicaPersistente/gestionDeCuadernos/dto';

function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerCuadernosIpc(cuadernos: Cuadernos): void {
  ipcMain.handle('cuadernos:listar', (_e, d: unknown) => cuadernos.listar(validar(usuarioSchema, d)));
  ipcMain.handle('cuadernos:obtener', (_e, d: unknown) => cuadernos.obtener(validar(cuadernoSchema, d)));
  ipcMain.handle('cuadernos:crearNota', (_e, d: unknown) => cuadernos.nuevaNota(validar(crearNotaSchema, d)));
  ipcMain.handle('cuadernos:modificarNota', (_e, d: unknown) => cuadernos.editarNota(validar(modificarNotaSchema, d)));
  ipcMain.handle('cuadernos:eliminarNota', async (_e, d: unknown) => {
    await cuadernos.borrarNota(validar(notaSchema, d));
    return { ok: true };
  });
}
