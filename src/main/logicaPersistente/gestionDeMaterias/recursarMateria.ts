import { Persistencia } from '../../persistencia/persistencia';
import { RecursarDTO } from './dto';

// Volver a cursar una materia: pasa a "cursando", se crea un cuaderno nuevo para esa cursada
// y, si se pide, se copian los horarios de la última vez que se cursó. El cuaderno anterior queda con sus notas.
export class RecursarMateria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: RecursarDTO): Promise<{ idCuaderno: number }> {
    return this.persistencia.transaccion(async (tx) => {
      const [materia] = await tx.ejecutar<{ nombre: string }>(
        `UPDATE materia m SET estado = 'cursando'
           FROM formacion f
          WHERE m.id_materia = $1 AND f.id_formacion = m.id_formacion AND f.id_usuario = $2
         RETURNING m.nombre`,
        [datos.idMateria, datos.usuarioId]
      );
      if (!materia) throw new Error('La materia no existe.');

      const [cuatrimestre] = await tx.ejecutar(
        `SELECT 1 FROM cuatrimestre WHERE id_cuatrimestre = $1 AND id_usuario = $2`,
        [datos.idCuatrimestre, datos.usuarioId]
      );
      if (!cuatrimestre) throw new Error('El cuatrimestre no existe.');

      // La última cursada (cuaderno más reciente de la materia en otro cuatrimestre): de ahí salen nombre y horarios.
      const [anterior] = await tx.ejecutar<{ nombre: string; id_cuatrimestre: number | null }>(
        `SELECT cu.nombre, cu.id_cuatrimestre FROM cuaderno cu
           LEFT JOIN cuatrimestre c ON c.id_cuatrimestre = cu.id_cuatrimestre
          WHERE cu.id_materia = $1 AND cu.id_usuario = $2 AND cu.id_cuatrimestre IS DISTINCT FROM $3
          ORDER BY c.fecha_inicio DESC NULLS LAST, cu.id_cuaderno DESC LIMIT 1`,
        [datos.idMateria, datos.usuarioId, datos.idCuatrimestre]
      );

      let idCuaderno: number;
      try {
        const [nuevo] = await tx.ejecutar<{ id_cuaderno: number }>(
          `INSERT INTO cuaderno (id_usuario, id_materia, nombre, id_cuatrimestre)
           VALUES ($1, $2, $3, $4) RETURNING id_cuaderno`,
          [datos.usuarioId, datos.idMateria, anterior?.nombre ?? materia.nombre, datos.idCuatrimestre]
        );
        idCuaderno = nuevo.id_cuaderno;
      } catch (error: any) {
        if (error?.code === '23505') throw new Error('Ya tenés un cuaderno de esta materia en ese cuatrimestre.');
        throw error;
      }

      if (datos.copiarHorarios && anterior?.id_cuatrimestre) {
        await tx.ejecutar(
          `INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, tono, id_materia, id_cuatrimestre)
           SELECT usuario_id, dia_semana, hora_inicio, hora_fin, titulo, tono, id_materia, $3
             FROM horarios_cursado
            WHERE usuario_id = $1 AND id_cuatrimestre = $2
              AND (id_materia = $4 OR (id_materia IS NULL AND lower(titulo) = lower($5)))`,
          [datos.usuarioId, anterior.id_cuatrimestre, datos.idCuatrimestre, datos.idMateria, materia.nombre]
        );
      }
      return { idCuaderno };
    });
  }
}
