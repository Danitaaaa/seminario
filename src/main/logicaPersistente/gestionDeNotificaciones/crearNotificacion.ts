import { Persistencia } from '../../persistencia/persistencia';
import { Notificacion } from './entidades';
import { materializarNotificacion } from './materializador';
import { CrearNotificacionDTO } from './dto';

// Guarda un aviso nuevo. Si ya había uno con la misma clave devuelve null y no repite.
export class CrearNotificacion {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearNotificacionDTO): Promise<Notificacion | null> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, clave, fecha)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, clave) DO NOTHING
       RETURNING *`,
      // La fecha la pone la app: Postgres corre en UTC y con NOW() quedaba 3 horas adelantada.
      [datos.usuarioId, datos.tipo, datos.titulo, datos.mensaje, datos.clave, new Date()]
    );
    return filas.length ? materializarNotificacion(filas[0]) : null;
  }
}