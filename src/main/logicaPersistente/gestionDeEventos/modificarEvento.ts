import { Evento } from './entidades';
import { ModificarEventoDTO } from './dto';
import { buscarEvento } from './buscarEvento';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Modifica los parámetros indicados de un evento
export class ModificarEvento {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(datos: ModificarEventoDTO): Promise<Evento> {
    const actual = await buscarEvento(this.persistencia, datos.id);
    await exigirAcceso(this.persistencia, actual.idProyecto, actual.usuarioId, datos.usuarioId, 'evento.eliminar');

    const campos: string[] = [];
    const valores: unknown[] = [];
    const cambios: Record<string, unknown> = {};

    const agregar = (columna: string, campo: string, valor: unknown, cast?: string): void => {
      if (valor !== undefined) {
        valores.push(valor);
        campos.push(`${columna} = $${valores.length}${cast ? `::${cast}` : ''}`);
        cambios[campo] = valor;
      }
    };

    agregar('titulo', 'titulo', datos.titulo);
    agregar('descripcion', 'descripcion', datos.descripcion);
    agregar('lugar', 'lugar', datos.lugar);
    agregar('fecha', 'fecha', datos.fecha);
    agregar('categoria', 'categoria', datos.categoria);
    agregar('prioridad', 'prioridad', datos.prioridad);
    agregar('notificaciones_activas', 'notificacionesActivas', datos.notificacionesActivas);

    // Si se desactivan las notificaciones, los recordatorios se vacían siempre
    const recordatorios = datos.notificacionesActivas === false ? [] : datos.recordatorios;
    if (recordatorios !== undefined) {
      valores.push(JSON.stringify(recordatorios));
      campos.push(`recordatorios = $${valores.length}::jsonb`);
      cambios.recordatorios = recordatorios;
    }

    if (campos.length === 0) return actual;

    return this.persistencia.transaccion(async (tx) => {
      valores.push(datos.id);
      const filas = await tx.ejecutar(
        `UPDATE eventos SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING id`,
        valores
      );
      if (filas.length === 0) throw new Error('El evento no existe');
      const evento = await buscarEvento(tx, datos.id);
      await registrarCambioSiProyecto(tx, evento.idProyecto, 'evento', evento.id, 'modificar', cambios);
      return evento;
    });
  }
}