import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Estadisticas } from '../administracionDePersistencia/estadisticas';
import { resumenProyectosSchema, resumenSesionesSchema } from '../logicaPersistente/gestionDeEstadisticas/dto';

function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerEstadisticasIpc(estadisticas: Estadisticas): void {
  ipcMain.handle('estadisticas:proyectos', async (_e, datos: unknown) =>
    estadisticas.proyectos(validar(resumenProyectosSchema, datos))
  );
  ipcMain.handle('estadisticas:sesiones', async (_e, datos: unknown) =>
    estadisticas.sesiones(validar(resumenSesionesSchema, datos))
  );
}