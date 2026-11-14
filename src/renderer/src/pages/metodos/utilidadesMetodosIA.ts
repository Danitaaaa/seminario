// Ayudas compartidas por las pantallas de Métodos que muestran material generado con IA.

// Los errores que vienen del main traen el prefijo de Electron; se muestra solo el mensaje.
// Si es un error de validación (zod manda la lista de problemas en JSON), se muestra solo el primero,
// y si no tiene un mensaje entendible, el mensaje por defecto: nunca el JSON crudo.
export function mensajeError(error: unknown, porDefecto: string): string {
  if (!(error instanceof Error)) return porDefecto;
  const mensaje = error.message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '').trim();
  if (mensaje.startsWith('[')) {
    try {
      const problemas = JSON.parse(mensaje) as { message?: string }[];
      const primero = problemas[0]?.message;
      return primero && !primero.startsWith('Invalid input') ? primero : porDefecto;
    } catch {
      return porDefecto;
    }
  }
  return mensaje || porDefecto;
}

export function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function porcentaje(correctas: number, total: number): number {
  return total > 0 ? Math.round((correctas / total) * 100) : 0;
}
