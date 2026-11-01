import { Persistencia } from '../../persistencia/persistencia';
import { Formacion } from './entidades';
import { materializarFormacion } from './materializador';
import { ModificarFormacionDTO } from './dto';

// Cambia los datos de una formación del usuario.
export class ModificarFormacion {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarFormacionDTO): Promise<Formacion> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE formacion
          SET tipo = $3, nombre = $4, institucion = $5, duracion_anios = $6, organizacion = $7, anio_actual = $8,
              cuatrimestre_actual = $9
        WHERE id_formacion = $1 AND id_usuario = $2
       RETURNING *`,
      [datos.idFormacion, datos.usuarioId, datos.tipo, datos.nombre, datos.institucion,
        datos.duracionAnios, datos.organizacion, datos.anioActual, datos.cuatrimestreActual]
    );
    if (filas.length === 0) throw new Error('La formación no existe.');
    return materializarFormacion(filas[0]);
  }
}
