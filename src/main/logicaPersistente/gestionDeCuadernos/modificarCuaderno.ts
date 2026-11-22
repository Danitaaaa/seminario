import { Persistencia } from '../../persistencia/persistencia';
import { ModificarCuadernoDTO } from './dto';
import { traducirError } from './errores';
import { guardarMateriasExtra } from './materiasExtra';

// Cambia el nombre, la materia, el cuatrimestre o las materias para las que cuenta un cuaderno del usuario.
// Las notas quedan en el cuaderno.
export class ModificarCuaderno {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarCuadernoDTO): Promise<void> {
    try {
      await this.persistencia.transaccion(async (tx) => {
        const filas = await tx.ejecutar(
          `UPDATE cuaderno c SET nombre = $3, id_materia = m.id_materia, id_cuatrimestre = $5
             FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
            WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND m.id_materia = $4 AND f.id_usuario = $2
              AND ($5::int IS NULL OR EXISTS (SELECT 1 FROM cuatrimestre WHERE id_cuatrimestre = $5 AND id_usuario = $2))
           RETURNING c.id_cuaderno`,
          [datos.idCuaderno, datos.usuarioId, datos.nombre, datos.idMateria, datos.idCuatrimestre]
        );
        if (filas.length === 0) throw new Error('El cuaderno no existe.');
        await guardarMateriasExtra(tx, datos.usuarioId, datos.idCuaderno, datos.idMateria, datos.materiasExtra);
      });
    } catch (error) {
      throw traducirError(error);
    }
  }
}
