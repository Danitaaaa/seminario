import { Persistencia } from '../../persistencia/persistencia';
import { ResumenFlashcards } from './entidades';
import { FORMATO_AGRUPAR, ResumenFlashcardsDTO } from './dto';
import { materializarResumenFlashcards } from './materializador';

// revisado_en lo pone Postgres (UTC): se pasa a la hora de la compu antes de agrupar.
const FECHA_LOCAL = `(r.revisado_en + make_interval(mins => $3::int))`;

// Cuánto repasó el usuario con flashcards: tarjetas repasadas, cómo le fueron y en qué mazos.
export class ResumenDeFlashcards {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ResumenFlashcardsDTO): Promise<ResumenFlashcards> {
    const valores = [datos.idUsuario, datos.desde, datos.desfaseMinutos];
    const desde = `FROM flashcard_revisiones r
           JOIN flashcards f ON f.id_flashcard = r.id_flashcard
           JOIN decks d ON d.id_deck = f.id_deck
          WHERE d.id_usuario = $1 AND ${FECHA_LOCAL}::date >= $2::date`;

    const [[totales], porMes, porMazo] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT COUNT(*)::int AS repasos,
                COUNT(DISTINCT r.id_flashcard)::int AS tarjetas,
                COUNT(DISTINCT d.id_deck)::int AS mazos,
                COUNT(*) FILTER (WHERE r.dificultad = 'facil')::int AS faciles,
                COUNT(*) FILTER (WHERE r.dificultad = 'dificil')::int AS dificiles
           ${desde}`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT to_char(${FECHA_LOCAL}, '${FORMATO_AGRUPAR[datos.agrupar]}') AS mes, COUNT(*)::int AS repasos
           ${desde}
          GROUP BY mes
          ORDER BY mes`,
        valores
      ),
      this.persistencia.ejecutar(
        `SELECT d.id_deck, d.nombre, COUNT(*)::int AS repasos
           ${desde}
          GROUP BY d.id_deck, d.nombre
          ORDER BY repasos DESC, d.nombre
          LIMIT 6`,
        valores
      ),
    ]);

    return materializarResumenFlashcards(totales, porMes, porMazo);
  }
}
