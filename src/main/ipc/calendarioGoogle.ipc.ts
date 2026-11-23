import { ipcMain } from 'electron';
import { CalendarioGoogle } from '../administracionDePersistencia/calendarioGoogle';
import {
  abrirEventoGoogleSchema,
  configurarCalendarioSchema,
  elegirCalendariosSchema,
  eventosOtrosSchema,
} from '../logicaPersistente/gestionDeCalendarioGoogle/dto';

// Todo es del usuario con la sesión iniciada; lo que llega de la pantalla se valida con Zod.
export function registerCalendarioGoogleIpc(calendario: CalendarioGoogle): void {
  ipcMain.handle('calendarioGoogle:estado', () => calendario.estado());
  ipcMain.handle('calendarioGoogle:conectar', () => calendario.conectar());
  ipcMain.handle('calendarioGoogle:sincronizar', () => calendario.sincronizar());
  ipcMain.handle('calendarioGoogle:desconectar', () => calendario.desconectar());
  ipcMain.handle('calendarioGoogle:cancelar', () => calendario.cancelarConexion());

  // Traer a Syntra lo que se edite en Google (sí o no).
  ipcMain.handle('calendarioGoogle:configurar', (_event, datos: unknown) => {
    const { traerCambios } = configurarCalendarioSchema.parse(datos);
    return calendario.configurar(traerCambios);
  });

  // Ver los otros calendarios de Google en Syntra (solo lectura).
  ipcMain.handle('calendarioGoogle:permitirLectura', () => calendario.permitirLectura());
  ipcMain.handle('calendarioGoogle:listarCalendarios', () => calendario.listarCalendarios());
  ipcMain.handle('calendarioGoogle:elegirCalendarios', (_event, datos: unknown) => {
    const { ids } = elegirCalendariosSchema.parse(datos);
    return calendario.elegirCalendarios(ids);
  });
  ipcMain.handle('calendarioGoogle:eventosOtros', (_event, datos: unknown) => {
    const { desde, hasta } = eventosOtrosSchema.parse(datos);
    return calendario.eventosOtros(desde, hasta);
  });
  ipcMain.handle('calendarioGoogle:abrirEvento', (_event, datos: unknown) => {
    const { id } = abrirEventoGoogleSchema.parse(datos);
    return calendario.abrirEvento(id);
  });
}
