import type { Evento, UnidadTiempo } from '../../logicaPersistente/gestionDeEventos/entidades';
import type { Meta } from '../../logicaPersistente/gestionDeMetas/entidades';
import type { CrearNotificacionDTO } from '../../logicaPersistente/gestionDeNotificaciones/dto';

const MS: Record<UnidadTiempo, number> = {
  minutos: 60_000,
  horas: 3_600_000,
  dias: 86_400_000,
  semanas: 7 * 86_400_000,
};

const dosCifras = (n: number) => String(n).padStart(2, '0');
const fechaISO = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const recortar = (texto: string, maximo: number) => (texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto);

// "hoy a las 10:00", "mañana", "el 26/10 a las 18:30". Un evento a las 00:00 es de todo el día.
export function cuandoEs(fecha: Date, ahora: Date): string {
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  const dia = fechaISO(fecha) === fechaISO(ahora) ? 'hoy'
    : fechaISO(fecha) === fechaISO(manana) ? 'mañana'
    : `el ${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}`;
  const todoElDia = fecha.getHours() === 0 && fecha.getMinutes() === 0;
  return todoElDia ? dia : `${dia} a las ${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
}

// Qué avisos ya deberían haber salido. Los repetidos los descarta la base por la clave.
export function avisosPendientes(usuarioId: number, eventos: Evento[], metas: Meta[], ahora: Date): CrearNotificacionDTO[] {
  const avisos: CrearNotificacionDTO[] = [];

  for (const evento of eventos) {
    const fecha = new Date(evento.fecha);
    // Un evento que ya empezó no avisa más.
    if (!evento.notificacionesActivas || fecha <= ahora) continue;
    for (const { cantidad, unidad } of evento.recordatorios) {
      const momento = fecha.getTime() - cantidad * (MS[unidad] ?? 0);
      if (momento > ahora.getTime()) continue;
      const cuando = cuandoEs(fecha, ahora);
      avisos.push({
        usuarioId,
        tipo: 'evento',
        titulo: recortar(evento.titulo, 120),
        mensaje: `Es ${cuando}${evento.lugar ? ` en ${evento.lugar}` : ''}.`,
        // Lleva la fecha: si el evento se mueve, el recordatorio vuelve a salir.
        clave: `evento:${evento.id}:${fecha.toISOString()}:${cantidad}-${unidad}`,
      });
    }
  }

  const hoy = fechaISO(ahora);
  for (const meta of metas) {
    if (meta.completada || meta.fechaLimite !== hoy) continue;
    avisos.push({
      usuarioId,
      tipo: 'meta',
      titulo: 'Tu meta vence hoy',
      mensaje: meta.titulo,
      clave: `meta:${meta.id}:${hoy}`,
    });
  }

  return avisos;
}