import { Persistencia } from '../../persistencia/Persistencia';
import { Evento } from './entidades';
import { materializarEvento } from './materializador';
import { ModificarEventoDTO } from './dto';

export class ModificarEvento {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarEventoDTO): Promise<Evento> {
    const campos: string[] = [];
    const valores: unknown[] = [];

    // CAMBIO: "cast" opcional, porque recordatorios necesita ::jsonb igual
    // que en CrearEvento (las demás columnas no necesitan casteo especial).
    const agregar = (columna: string, valor: unknown, cast?: string): void => {
      if (valor !== undefined) {
        valores.push(valor);
        campos.push(`${columna} = $${valores.length}${cast ? `::${cast}` : ''}`);
      }
    };

    agregar('titulo', datos.titulo);
    agregar('descripcion', datos.descripcion);
    agregar('lugar', datos.lugar);
    agregar('fecha', datos.fecha);
    agregar('categoria', datos.categoria);
    agregar('prioridad', datos.prioridad);
    agregar('notificaciones_activas', datos.notificacionesActivas);
    agregar(
      'recordatorios',
      datos.recordatorios !== undefined
        ? JSON.stringify(datos.notificacionesActivas === false ? [] : datos.recordatorios)
        : undefined,
      'jsonb'
    );

    valores.push(datos.id);

    const filas = await this.persistencia.ejecutar(
      `UPDATE eventos SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    return materializarEvento(filas[0]);
  }
}
