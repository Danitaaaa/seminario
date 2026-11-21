// Espejo del estado que devuelve el main (administracionDePersistencia/calendarioGoogle.ts).
export interface EstadoCalendarioGoogle {
  conectado: boolean;
  correo: string | null;
  ultimaSincronizacion: string | null;
  reconectar: boolean; // el permiso de Google venció
}
