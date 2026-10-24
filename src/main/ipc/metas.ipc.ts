import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Metas } from '../administracionDePersistencia/metas';
import {
  crearMetaSchema,
  listarMetasSchema,
  completarMetaSchema,
  eliminarMetaSchema,
} from '../logicaPersistente/gestionDeMetas/dto';

// Valida con Zod y, si falla, devuelve el primer mensaje legible (ej. "Escribí la meta.").
function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerMetasIpc(metas: Metas): void {
  ipcMain.handle('metas:listar', async (_e, datos: unknown) =>
    metas.listar(validar(listarMetasSchema, datos))
  );
  ipcMain.handle('metas:crear', async (_e, datos: unknown) =>
    metas.crear(validar(crearMetaSchema, datos))
  );
  ipcMain.handle('metas:completar', async (_e, datos: unknown) =>
    metas.completar(validar(completarMetaSchema, datos))
  );
  ipcMain.handle('metas:eliminar', async (_e, datos: unknown) => {
    await metas.eliminar(validar(eliminarMetaSchema, datos));
  });
}