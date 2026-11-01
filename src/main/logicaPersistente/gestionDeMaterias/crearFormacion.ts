import { Persistencia } from '../../persistencia/persistencia';
import { Formacion } from './entidades';
import { materializarFormacion } from './materializador';
import { CrearFormacionDTO } from './dto';

// Crea una formación (carrera, curso, academia...) del usuario.
export class CrearFormacion {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearFormacionDTO): Promise<Formacion> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO formacion (id_usuario, tipo, nombre, institucion, duracion_anios, organizacion, anio_actual, cuatrimestre_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [datos.usuarioId, datos.tipo, datos.nombre, datos.institucion, datos.duracionAnios, datos.organizacion, datos.anioActual, datos.cuatrimestreActual]
    );
    return materializarFormacion(filas[0]);
  }
}
