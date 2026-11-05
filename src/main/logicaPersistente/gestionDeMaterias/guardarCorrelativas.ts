import { Persistencia } from '../../persistencia/persistencia';
import { Correlativa } from './entidades';
import { materializarCorrelativa } from './materializador';
import { GuardarCorrelativasDTO } from './dto';

// Reemplaza las correlativas de una materia. Tienen que ser de la misma formación
// y no pueden armar un círculo (A necesita B y B necesita A).
export class GuardarCorrelativas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: GuardarCorrelativasDTO): Promise<Correlativa[]> {
    const requisitos = [...new Set(datos.requisitos)];
    if (requisitos.includes(datos.idMateria)) throw new Error('Una materia no puede ser correlativa de sí misma.');

    return this.persistencia.transaccion(async (tx) => {
      const materia = await tx.ejecutar<{ id_formacion: number }>(
        `SELECT m.id_formacion FROM materia m
           JOIN formacion f ON f.id_formacion = m.id_formacion
          WHERE m.id_materia = $1 AND f.id_usuario = $2`,
        [datos.idMateria, datos.usuarioId]
      );
      if (materia.length === 0) throw new Error('La materia no existe.');

      if (requisitos.length > 0) {
        const mismas = await tx.ejecutar(
          `SELECT id_materia FROM materia WHERE id_formacion = $1 AND id_materia = ANY($2::int[])`,
          [materia[0].id_formacion, requisitos]
        );
        if (mismas.length !== requisitos.length) throw new Error('Las correlativas tienen que ser de la misma formación.');

        const circulo = await tx.ejecutar(
          `WITH RECURSIVE necesarias AS (
             SELECT unnest($2::int[]) AS id_requisito
             UNION
             SELECT c.id_requisito FROM materia_correlativa c JOIN necesarias n ON c.id_materia = n.id_requisito
           )
           SELECT 1 FROM necesarias WHERE id_requisito = $1 LIMIT 1`,
          [datos.idMateria, requisitos]
        );
        if (circulo.length > 0) throw new Error('Eso arma un círculo: una de esas materias ya necesita a esta.');
      }

      await tx.ejecutar(`DELETE FROM materia_correlativa WHERE id_materia = $1`, [datos.idMateria]);
      const filas = await tx.ejecutar(
        `INSERT INTO materia_correlativa (id_materia, id_requisito)
         SELECT $1, unnest($2::int[])
         RETURNING id_materia, id_requisito`,
        [datos.idMateria, requisitos]
      );
      return filas.map(materializarCorrelativa);
    });
  }
}
