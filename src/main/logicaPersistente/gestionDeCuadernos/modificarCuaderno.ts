import { Persistencia } from '../../persistencia/persistencia';
import { ModificarCuadernoDTO } from './dto';
import { traducirError } from './errores';

// Cambia el nombre o la materia de un cuaderno del usuario. Las notas quedan en el cuaderno.
export class ModificarCuaderno {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarCuadernoDTO): Promise<void> {
    try {
      const filas = await this.persistencia.ejecutar(
        `UPDATE cuaderno c SET nombre = $3, id_materia = m.id_materia
           FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
          WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND m.id_materia = $4 AND f.id_usuario = $2
         RETURNING c.id_cuaderno`,
        [datos.idCuaderno, datos.usuarioId, datos.nombre, datos.idMateria]
      );
      if (filas.length === 0) throw new Error('El cuaderno no existe.');
    } catch (error) {
      throw traducirError(error);
    }
  }
}
