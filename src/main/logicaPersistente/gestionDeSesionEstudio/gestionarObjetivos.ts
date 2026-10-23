import { Persistencia } from '../../persistencia/persistencia';
import { ObjetivoSesion } from './entidades';
import { ActualizarObjetivoDTO, AgregarObjetivoDTO } from './dto';

// Agrega, edita, tilda y elimina los objetivos de una sesión.
// Todas las operaciones verifican que la sesión pertenezca al usuario.
export class GestionarObjetivos {
  constructor(private readonly persistencia: Persistencia) {}

  async agregar(idUsuario: number, datos: AgregarObjetivoDTO): Promise<ObjetivoSesion> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, orden)
       SELECT s.id_sesion_estudio, $3,
              COALESCE((SELECT MAX(o.orden) + 1
                          FROM objetivo_sesion o
                         WHERE o.id_sesion_estudio = s.id_sesion_estudio), 0)
         FROM sesion_estudio s
        WHERE s.id_sesion_estudio = $1 AND s.id_usuario = $2
       RETURNING *`,
      [datos.idSesion, idUsuario, datos.descripcion]
    );
    if (filas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }
    return this.materializar(filas[0]);
  }

  async actualizar(idUsuario: number, datos: ActualizarObjetivoDTO): Promise<ObjetivoSesion> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE objetivo_sesion o
          SET descripcion = COALESCE($3::varchar, o.descripcion),
              completado = COALESCE($4::boolean, o.completado)
         FROM sesion_estudio s
        WHERE o.id_objetivo = $1
          AND s.id_sesion_estudio = o.id_sesion_estudio
          AND s.id_usuario = $2
       RETURNING o.*`,
      [datos.idObjetivo, idUsuario, datos.descripcion ?? null, datos.completado ?? null]
    );
    if (filas.length === 0) {
      throw new Error('El objetivo no existe.');
    }
    return this.materializar(filas[0]);
  }

  async eliminar(idUsuario: number, idObjetivo: number): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM objetivo_sesion o
        USING sesion_estudio s
        WHERE o.id_objetivo = $1
          AND s.id_sesion_estudio = o.id_sesion_estudio
          AND s.id_usuario = $2
       RETURNING o.id_objetivo`,
      [idObjetivo, idUsuario]
    );
    if (filas.length === 0) {
      throw new Error('El objetivo no existe.');
    }
  }

  // Convierte una fila de objetivo_sesion en un ObjetivoSesion.
  private materializar(fila: any): ObjetivoSesion {
    return {
      idObjetivo: fila.id_objetivo,
      idSesion: fila.id_sesion_estudio,
      descripcion: fila.descripcion,
      completado: fila.completado,
      orden: fila.orden,
    };
  }
}
