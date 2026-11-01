import { Persistencia } from '../../persistencia/persistencia';
import { MateriaFormacion } from './entidades';
import { materializarMateria } from './materializador';
import { ModificarMateriaDTO } from './dto';
import { traducirError } from './errores';

// Cambia nombre, año, cuatrimestre o estado de una materia del usuario.
export class ModificarMateria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarMateriaDTO): Promise<MateriaFormacion> {
    try {
      const filas = await this.persistencia.ejecutar(
        `UPDATE materia m
            SET nombre = $3, anio = $4, cuatrimestre = $5, estado = $6
           FROM formacion f
          WHERE m.id_materia = $1 AND f.id_formacion = m.id_formacion AND f.id_usuario = $2
         RETURNING m.*`,
        [datos.idMateria, datos.usuarioId, datos.nombre, datos.anio, datos.cuatrimestre, datos.estado]
      );
      if (filas.length === 0) throw new Error('La materia no existe.');
      return materializarMateria(filas[0]);
    } catch (error) {
      throw traducirError(error);
    }
  }
}
