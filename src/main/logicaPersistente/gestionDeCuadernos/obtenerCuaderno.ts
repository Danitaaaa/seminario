import { Persistencia } from '../../persistencia/persistencia';
import { Cuaderno } from './entidades';
import { materializarNota } from './materializador';
import { CuadernoDTO } from './dto';
import { ListarCuadernos } from './listarCuadernos';
import { mazosDelCuaderno } from './mazosDelCuaderno';

// Un cuaderno con todo lo de su materia: carpetas de Material, mazos, sesiones de estudio, y sus notas.
export class ObtenerCuaderno {
  constructor(private readonly persistencia: Persistencia, private readonly listar: ListarCuadernos) {}

  async ejecutar(datos: CuadernoDTO): Promise<Cuaderno> {
    const [resumen] = await this.listar.ejecutar({ usuarioId: datos.usuarioId }, datos.idCuaderno);
    if (!resumen) throw new Error('El cuaderno no existe.');
    const { idMateria, nombre } = resumen.materia;

    const [carpetas, mazos, sesiones, metodos, notas] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT n.id_nodo, n.nombre,
                ((SELECT count(*) FROM nodos h WHERE h.id_padre = n.id_nodo)
                 + (SELECT count(*) FROM archivos a WHERE a.id_padre = n.id_nodo))::int AS elementos
           FROM nodos n WHERE n.id_materia = $1 ORDER BY n.nombre`,
        [idMateria]
      ),
      this.persistencia.ejecutar(
        `SELECT d.id_deck, d.nombre, count(f.id_flashcard)::int AS flashcards,
                -- Solo se puede sacar si está únicamente a mano (no por la materia ni por una sesión).
                (EXISTS (SELECT 1 FROM cuaderno_mazo cm WHERE cm.id_cuaderno = $4 AND cm.id_deck = d.id_deck)
                 AND lower(trim(coalesce(d.materia_asociada, ''))) <> lower($2)
                 AND NOT EXISTS (SELECT 1 FROM sesion_estudio s
                                  WHERE s.id_usuario = $1 AND s.id_materia = $3 AND s.id_deck = d.id_deck)) AS a_mano
           FROM decks d LEFT JOIN flashcards f ON f.id_deck = d.id_deck
          WHERE d.id_deck IN (${mazosDelCuaderno('$1', '$2', '$3', '$4')})
          GROUP BY d.id_deck ORDER BY d.nombre`,
        [datos.usuarioId, nombre, idMateria, datos.idCuaderno]
      ),
      this.persistencia.ejecutar(
        `SELECT id_sesion_estudio, nombre, to_char(fecha_programada, 'YYYY-MM-DD') AS fecha, estado
           FROM sesion_estudio WHERE id_usuario = $1 AND id_materia = $2
          ORDER BY fecha_programada DESC LIMIT 10`,
        [datos.usuarioId, idMateria]
      ),
      this.persistencia.ejecutar(
        `SELECT t.nombre, count(*)::int AS sesiones
           FROM sesion_estudio s
           JOIN sesion_estudio_metodo_estudio sm ON sm.id_sesion_estudio = s.id_sesion_estudio
           JOIN tipo_metodo_estudio t ON t.id_tipo_metodo_estudio = sm.id_tipo_metodo_estudio
          WHERE s.id_usuario = $1 AND s.id_materia = $2
          GROUP BY t.nombre ORDER BY sesiones DESC, t.nombre`,
        [datos.usuarioId, idMateria]
      ),
      this.persistencia.ejecutar(
        `SELECT id_nota, id_cuaderno, tipo, nombre, to_char(fecha, 'YYYY-MM-DD') AS fecha, nota, estado
           FROM nota WHERE id_cuaderno = $1
          ORDER BY fecha NULLS LAST, id_nota`,
        [datos.idCuaderno]
      ),
    ]);

    return {
      resumen,
      carpetas: carpetas.map((c: any) => ({ idNodo: c.id_nodo, nombre: c.nombre, elementos: c.elementos })),
      mazos: mazos.map((m: any) => ({ idDeck: m.id_deck, nombre: m.nombre, flashcards: m.flashcards, aMano: m.a_mano })),
      sesiones: sesiones.map((s: any) => ({ idSesion: s.id_sesion_estudio, nombre: s.nombre, fecha: s.fecha, estado: s.estado })),
      metodos: metodos.map((m: any) => ({ nombre: m.nombre, sesiones: m.sesiones })),
      notas: notas.map(materializarNota),
    };
  }
}
