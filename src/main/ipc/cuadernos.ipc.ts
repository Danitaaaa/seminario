import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Cuadernos } from '../administracionDePersistencia/cuadernos';
import {
  crearCuadernoSchema, crearNotaSchema, cuadernoSchema, mazoCuadernoSchema, modificarCuadernoSchema, modificarNotaSchema, notaSchema, usuarioSchema,
} from '../logicaPersistente/gestionDeCuadernos/dto';

function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerCuadernosIpc(cuadernos: Cuadernos): void {
  ipcMain.handle('cuadernos:listar', (_e, d: unknown) => cuadernos.listar(validar(usuarioSchema, d)));
  ipcMain.handle('cuadernos:obtener', (_e, d: unknown) => cuadernos.obtener(validar(cuadernoSchema, d)));
  ipcMain.handle('cuadernos:crear', (_e, d: unknown) => cuadernos.nuevo(validar(crearCuadernoSchema, d)));
  ipcMain.handle('cuadernos:modificar', async (_e, d: unknown) => {
    await cuadernos.editar(validar(modificarCuadernoSchema, d));
    return { ok: true };
  });
  ipcMain.handle('cuadernos:eliminar', async (_e, d: unknown) => {
    await cuadernos.borrar(validar(cuadernoSchema, d));
    return { ok: true };
  });

  ipcMain.handle('cuadernos:agregarMazo', async (_e, d: unknown) => {
    await cuadernos.sumarMazo(validar(mazoCuadernoSchema, d));
    return { ok: true };
  });
  ipcMain.handle('cuadernos:quitarMazo', async (_e, d: unknown) => {
    await cuadernos.sacarMazo(validar(mazoCuadernoSchema, d));
    return { ok: true };
  });

  ipcMain.handle('cuadernos:crearNota', (_e, d: unknown) => cuadernos.nuevaNota(validar(crearNotaSchema, d)));
  ipcMain.handle('cuadernos:modificarNota', (_e, d: unknown) => cuadernos.editarNota(validar(modificarNotaSchema, d)));
  ipcMain.handle('cuadernos:eliminarNota', async (_e, d: unknown) => {
    await cuadernos.borrarNota(validar(notaSchema, d));
    return { ok: true };
  });
}
