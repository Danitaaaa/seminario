import { Persistencia } from '../../persistencia/persistencia';
import { CrearCuadernoDTO } from './dto';
import { traducirError } from './errores';
import { guardarMateriasExtra } from './materiasExtra';

// Crea un cuaderno con nombre, una materia del usuario y, si se eligió, el cuatrimestre de esa cursada.
// Devuelve el id.
export class CrearCuaderno {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearCuadernoDTO): Promise<{ idCuaderno: number }> {
    try {
      return await this.persistencia.transaccion(async (tx) => {
        const filas = await tx.ejecutar<{ id_cuaderno: number }>(
          `INSERT INTO cuaderno (id_usuario, id_materia, nombre, id_cuatrimestre)
           SELECT $1, m.id_materia, $3, $4
             FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
            WHERE m.id_materia = $2 AND f.id_usuario = $1
              AND ($4::int IS NULL OR EXISTS (SELECT 1 FROM cuatrimestre WHERE id_cuatrimestre = $4 AND id_usuario = $1))
           RETURNING id_cuaderno`,
          [datos.usuarioId, datos.idMateria, datos.nombre, datos.idCuatrimestre]
        );
        if (filas.length === 0) throw new Error('La materia o el cuatrimestre no existen.');
        const idCuaderno = filas[0].id_cuaderno;
        await guardarMateriasExtra(tx, datos.usuarioId, idCuaderno, datos.idMateria, datos.materiasExtra);
        return { idCuaderno };
      });
    } catch (error) {
      throw traducirError(error);
    }
  }
}
