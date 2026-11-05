import { Persistencia } from '../../persistencia/persistencia';
import { Cuaderno } from './entidades';
import { materializarNota } from './materializador';
import { CuadernoDTO } from './dto';
import { ListarCuadernos } from './listarCuadernos';

const NOTAS_SQL = `SELECT id_nota, id_materia, tipo, nombre, to_char(fecha, 'YYYY-MM-DD') AS fecha, nota, estado
                     FROM nota WHERE id_materia = $1
                    ORDER BY fecha NULLS LAST, id_nota`;

// Todo lo de una materia: carpetas de Material, mazos, sesiones de estudio y notas.
export class ObtenerCuaderno {
  constructor(private readonly persistencia: Persistencia, private readonly listar: ListarCuadernos) {}

  async ejecutar(datos: CuadernoDTO): Promise<Cuaderno> {
    const [resumen] = await this.listar.ejecutar({ usuarioId: datos.usuarioId }, datos.idMateria);
    if (!resumen) throw new Error('El cuaderno no existe.');

    const [carpetas, mazos, sesiones, notas] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT n.id_nodo, n.nombre,
                ((SELECT count(*) FROM nodos h WHERE h.id_padre = n.id_nodo)
                 + (SELECT count(*) FROM archivos a WHERE a.id_padre = n.id_nodo))::int AS elementos
           FROM nodos n WHERE n.id_materia = $1 ORDER BY n.nombre`,
        [datos.idMateria]
      ),
      this.persistencia.ejecutar(
        `SELECT d.id_deck, d.nombre, count(f.id_flashcard)::int AS flashcards
           FROM decks d LEFT JOIN flashcards f ON f.id_deck = d.id_deck
          WHERE d.id_usuario = $1 AND lower(trim(d.materia_asociada)) = lower($2)
          GROUP BY d.id_deck ORDER BY d.nombre`,
        [datos.usuarioId, resumen.nombre]
      ),
      this.persistencia.ejecutar(
        `SELECT id_sesion_estudio, nombre, to_char(fecha_programada, 'YYYY-MM-DD') AS fecha, estado
           FROM sesion_estudio WHERE id_usuario = $1 AND id_materia = $2
          ORDER BY fecha_programada DESC LIMIT 10`,
        [datos.usuarioId, datos.idMateria]
      ),
      this.persistencia.ejecutar(NOTAS_SQL, [datos.idMateria]),
    ]);

    return {
      resumen,
      carpetas: carpetas.map((c: any) => ({ idNodo: c.id_nodo, nombre: c.nombre, elementos: c.elementos })),
      mazos: mazos.map((m: any) => ({ idDeck: m.id_deck, nombre: m.nombre, flashcards: m.flashcards })),
      sesiones: sesiones.map((s: any) => ({ idSesion: s.id_sesion_estudio, nombre: s.nombre, fecha: s.fecha, estado: s.estado })),
      notas: notas.map(materializarNota),
    };
  }
}
