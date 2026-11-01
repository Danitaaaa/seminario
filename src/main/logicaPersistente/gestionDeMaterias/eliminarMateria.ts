import { Persistencia } from '../../persistencia/persistencia';
import { MateriaDTO } from './dto';
import { traducirError } from './errores';

// Elimina una materia del usuario. No se puede si tiene sesiones de estudio.
export class EliminarMateria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MateriaDTO): Promise<void> {
    try {
      const filas = await this.persistencia.ejecutar(
        `DELETE FROM materia m
          USING formacion f
          WHERE m.id_materia = $1 AND f.id_formacion = m.id_formacion AND f.id_usuario = $2
         RETURNING m.id_materia`,
        [datos.idMateria, datos.usuarioId]
      );
      if (filas.length === 0) throw new Error('La materia no existe.');
    } catch (error) {
      throw traducirError(error);
    }
  }
}
