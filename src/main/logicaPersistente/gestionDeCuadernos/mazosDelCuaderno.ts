// Ids de los mazos de un cuaderno: los de su materia (por nombre), los usados en sesiones
// de esa materia y los asignados a la materia (decks.id_materia). Parámetros: $usuario, $nombreMateria, $idMateria.
export const mazosDelCuaderno = (usuario: string, nombreMateria: string, idMateria: string) => `
  SELECT d.id_deck FROM decks d
   WHERE d.id_usuario = ${usuario} AND lower(trim(d.materia_asociada)) = lower(${nombreMateria})
  UNION
  SELECT s.id_deck FROM sesion_estudio s
   WHERE s.id_usuario = ${usuario} AND s.id_materia = ${idMateria} AND s.id_deck IS NOT NULL
  UNION
  SELECT d.id_deck FROM decks d
   WHERE d.id_usuario = ${usuario} AND d.id_materia = ${idMateria}`;
