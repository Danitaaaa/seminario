import { Persistencia } from '../../persistencia/persistencia';
import { Evento } from './entidades';
import { materializarEvento } from './materializador';
import { CrearEventoDTO } from './dto';

export class CrearEvento {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearEventoDTO): Promise<Evento> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO eventos
         (usuario_id, titulo, descripcion, lugar, fecha, categoria, prioridad, notificaciones_activas, recordatorios)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING *`,
      [
        datos.usuarioId,
        datos.titulo,
        datos.descripcion ?? null,
        datos.lugar ?? null,
        datos.fecha,
        datos.categoria,
        datos.prioridad,
        datos.notificacionesActivas,
        JSON.stringify(datos.notificacionesActivas ? datos.recordatorios : []),
      ]
    );
    return materializarEvento(filas[0]);
  }
}
