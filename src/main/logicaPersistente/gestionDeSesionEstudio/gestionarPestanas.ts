import { Persistencia } from '../../persistencia/persistencia';
import { PestanaSesion } from './entidades';
import { CrearPestanaDTO, RenombrarPestanaDTO } from './dto';
import { materializarPestana } from './materializador';

// Máximo de pestañas por sesión, para que la barra no se desborde.
const MAXIMO_PESTANAS = 12;

// Lista, crea, renombra y elimina las pestañas del editor de una sesión.
// Guardar su contenido lo hace GuardarContenidoSesion, que además actualiza el Word.
// Todas las operaciones verifican que la sesión pertenezca al usuario.
export class GestionarPestanas {
  constructor(private readonly persistencia: Persistencia) {}

  async listar(idUsuario: number, idSesion: number): Promise<PestanaSesion[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT p.*
         FROM pestana_sesion p
         JOIN sesion_estudio s ON s.id_sesion_estudio = p.id_sesion_estudio
        WHERE p.id_sesion_estudio = $1 AND s.id_usuario = $2
        ORDER BY p.orden, p.id_pestana`,
      [idSesion, idUsuario]
    );
    return filas.map(materializarPestana);
  }

  // Agrega una pestaña al final. Si no se pasa título se numera sola ("Pestaña 3").
  async crear(idUsuario: number, datos: CrearPestanaDTO): Promise<PestanaSesion> {
    const filas = await this.persistencia.ejecutar(
      `WITH actual AS (
         SELECT s.id_sesion_estudio,
                COUNT(p.id_pestana)::int AS cantidad,
                COALESCE(MAX(p.orden), -1) AS ultimo_orden
           FROM sesion_estudio s
           LEFT JOIN pestana_sesion p ON p.id_sesion_estudio = s.id_sesion_estudio
          WHERE s.id_sesion_estudio = $1 AND s.id_usuario = $2
          GROUP BY s.id_sesion_estudio
       )
       INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden)
       SELECT id_sesion_estudio,
              COALESCE($3::varchar, 'Pestaña ' || (cantidad + 1)),
              ultimo_orden + 1
         FROM actual
        WHERE cantidad < $4
       RETURNING *`,
      [datos.idSesion, idUsuario, datos.titulo ?? null, MAXIMO_PESTANAS]
    );
    if (filas.length === 0) {
      throw new Error(`La sesión no existe o ya tiene ${MAXIMO_PESTANAS} pestañas.`);
    }
    return materializarPestana(filas[0]);
  }

  async renombrar(idUsuario: number, datos: RenombrarPestanaDTO): Promise<PestanaSesion> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE pestana_sesion p
          SET titulo = $3, fecha_modificacion = now()
         FROM sesion_estudio s
        WHERE p.id_pestana = $1
          AND s.id_sesion_estudio = p.id_sesion_estudio
          AND s.id_usuario = $2
       RETURNING p.*`,
      [datos.idPestana, idUsuario, datos.titulo]
    );
    if (filas.length === 0) throw new Error('La pestaña no existe.');
    return materializarPestana(filas[0]);
  }

  // Elimina una pestaña. La última que queda no se puede borrar.
  // Devuelve el id de la sesión a la que pertenecía, para regenerar su Word.
  async eliminar(idUsuario: number, idPestana: number): Promise<number> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM pestana_sesion p
        USING sesion_estudio s
        WHERE p.id_pestana = $1
          AND s.id_sesion_estudio = p.id_sesion_estudio
          AND s.id_usuario = $2
          AND (SELECT COUNT(*) FROM pestana_sesion o WHERE o.id_sesion_estudio = p.id_sesion_estudio) > 1
       RETURNING p.id_sesion_estudio`,
      [idPestana, idUsuario]
    );
    if (filas.length === 0) {
      throw new Error('No se puede eliminar: la sesión necesita al menos una pestaña.');
    }
    return filas[0].id_sesion_estudio;
  }
}
