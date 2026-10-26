import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Notificaciones } from '../administracionDePersistencia/notificaciones';
import { VigiaNotificaciones } from '../logicaNoPersistente/notificaciones/vigiaNotificaciones';
import {
  usuarioSchema,
  marcarLeidasSchema,
  silenciarSchema,
} from '../logicaPersistente/gestionDeNotificaciones/dto';

function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerNotificacionesIpc(notificaciones: Notificaciones, vigia: VigiaNotificaciones): void {
  ipcMain.handle('notificaciones:listar', async (_e, datos: unknown) =>
    notificaciones.listar(validar(usuarioSchema, datos))
  );
  ipcMain.handle('notificaciones:marcarLeidas', async (_e, datos: unknown) => {
    await notificaciones.marcarLeidas(validar(marcarLeidasSchema, datos));
  });
  ipcMain.handle('notificaciones:obtenerSilencio', async (_e, datos: unknown) =>
    notificaciones.estaSilenciado(validar(usuarioSchema, datos).usuarioId)
  );
  ipcMain.handle('notificaciones:silenciar', async (_e, datos: unknown) =>
    notificaciones.silenciar(validar(silenciarSchema, datos))
  );
  // La ventana avisa quién tiene la sesión abierta; al cerrar sesión se deja de vigilar.
  ipcMain.handle('notificaciones:vigilar', async (_e, datos: unknown) => {
    await vigia.vigilar(validar(usuarioSchema, datos).usuarioId);
  });
  ipcMain.handle('notificaciones:detener', async () => vigia.detener());
}