import { Persistencia } from '../../persistencia/persistencia';

// Deja las materias de otras formaciones para las que cuenta el cuaderno (reemplaza las que había).
// Solo materias del usuario y distintas de la principal.
export async function guardarMateriasExtra(
  tx: Persistencia, usuarioId: number, idCuaderno: number, idMateria: number, extras: number[],
): Promise<void> {
  await tx.ejecutar(`DELETE FROM cuaderno_materia_extra WHERE id_cuaderno = $1`, [idCuaderno]);
  const otras = [...new Set(extras)].filter((id) => id !== idMateria);
  if (otras.length === 0) return;
  await tx.ejecutar(
    `INSERT INTO cuaderno_materia_extra (id_cuaderno, id_materia)
     SELECT $1, m.id_materia FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
      WHERE m.id_materia = ANY($2::int[]) AND f.id_usuario = $3`,
    [idCuaderno, otras, usuarioId]
  );
}
