import { Persistencia } from '../../persistencia/persistencia';

// El mazo que se repasa en una sesión tiene que ser del mismo usuario.
export async function exigirMazoPropio(persistencia: Persistencia, idUsuario: number, idDeck: number | null | undefined): Promise<void> {
  if (idDeck == null) return;
  const filas = await persistencia.ejecutar(
    `SELECT 1 FROM decks WHERE id_deck = $1 AND id_usuario = $2`,
    [idDeck, idUsuario]
  );
  if (filas.length === 0) throw new Error('El mazo de flashcards elegido no existe.');
}
