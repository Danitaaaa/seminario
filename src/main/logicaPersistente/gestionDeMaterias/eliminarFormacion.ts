import { Persistencia } from '../../persistencia/persistencia';
import { FormacionDTO } from './dto';
import { traducirError } from './errores';

// Borra la formación con todas sus materias.
export class EliminarFormacion {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: FormacionDTO): Promise<void> {
    try {
      const filas = await this.persistencia.ejecutar(
        `DELETE FROM formacion WHERE id_formacion = $1 AND id_usuario = $2 RETURNING id_formacion`,
        [datos.idFormacion, datos.usuarioId]
      );
      if (filas.length === 0) throw new Error('La formación no existe.');
    } catch (error) {
      throw traducirError(error);
    }
  }
}
