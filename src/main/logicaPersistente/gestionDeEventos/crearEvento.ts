import { Evento } from './entidades';
import { CrearEventoDTO } from './dto';
import { buscarEvento } from './buscarEvento';
import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';

// Crea un nuevo evento (personal, o de un proyecto si viene idProyecto)
export class CrearEvento {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(datos: CrearEventoDTO): Promise<Evento> {
    const idProyecto = datos.idProyecto ?? null;
    await exigirAcceso(this.persistencia, idProyecto, datos.usuarioId, datos.usuarioId, ['propietario', 'editor']);

    return this.persistencia.transaccion(async (tx) => {
      const filas = await tx.ejecutar(
        `INSERT INTO eventos
           (usuario_id, id_proyecto, titulo, descripcion, lugar, fecha, categoria, prioridad, notificaciones_activas, recordatorios)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         RETURNING id`,
        [
          datos.usuarioId,
          idProyecto,
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
      const evento = await buscarEvento(tx, filas[0].id);
      await registrarCambioSiProyecto(tx, evento.idProyecto, 'evento', evento.id, 'crear',
        { titulo: evento.titulo, fecha: evento.fecha });
      return evento;
    });
  }
}