import { ipcMain } from 'electron';
import { CalendarioGoogle } from '../administracionDePersistencia/calendarioGoogle';

// Sin datos de entrada: todo es del usuario con la sesión iniciada.
export function registerCalendarioGoogleIpc(calendario: CalendarioGoogle): void {
  ipcMain.handle('calendarioGoogle:estado', () => calendario.estado());
  ipcMain.handle('calendarioGoogle:conectar', () => calendario.conectar());
  ipcMain.handle('calendarioGoogle:sincronizar', () => calendario.sincronizar());
  ipcMain.handle('calendarioGoogle:desconectar', () => calendario.desconectar());
  ipcMain.handle('calendarioGoogle:cancelar', () => calendario.cancelarConexion());
}
