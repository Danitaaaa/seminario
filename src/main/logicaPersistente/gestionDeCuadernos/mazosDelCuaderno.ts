// Ids de los mazos de un cuaderno: los de su materia (por nombre), los usados en sesiones
// de esa materia y los agregados a mano. Parámetros: $usuario, $nombreMateria, $idMateria, $idCuaderno.
export const mazosDelCuaderno = (usuario: string, nombreMateria: string, idMateria: string, idCuaderno: string) => `
  SELECT d.id_deck FROM decks d
   WHERE d.id_usuario = ${usuario} AND lower(trim(d.materia_asociada)) = lower(${nombreMateria})
  UNION
  SELECT s.id_deck FROM sesion_estudio s
   WHERE s.id_usuario = ${usuario} AND s.id_materia = ${idMateria} AND s.id_deck IS NOT NULL
  UNION
  SELECT cm.id_deck FROM cuaderno_mazo cm WHERE cm.id_cuaderno = ${idCuaderno}`;
