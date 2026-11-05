import { Persistencia } from '../../persistencia/persistencia';
import { CrearCuadernoDTO } from './dto';
import { traducirError } from './errores';

// Crea un cuaderno con nombre y una materia del usuario. Devuelve el id.
export class CrearCuaderno {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearCuadernoDTO): Promise<{ idCuaderno: number }> {
    try {
      const filas = await this.persistencia.ejecutar<{ id_cuaderno: number }>(
        `INSERT INTO cuaderno (id_usuario, id_materia, nombre)
         SELECT $1, m.id_materia, $3
           FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
          WHERE m.id_materia = $2 AND f.id_usuario = $1
         RETURNING id_cuaderno`,
        [datos.usuarioId, datos.idMateria, datos.nombre]
      );
      if (filas.length === 0) throw new Error('La materia no existe.');
      return { idCuaderno: filas[0].id_cuaderno };
    } catch (error) {
      throw traducirError(error);
    }
  }
}
