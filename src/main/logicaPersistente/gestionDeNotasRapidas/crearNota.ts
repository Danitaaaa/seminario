import { Persistencia } from '../../persistencia/persistencia';
import { CrearNotaDTO } from './dto';
import { NotaRapida } from './entidades';
import { materializarNota, type FilaNota } from './materializador';

// Tope de notas por carpeta: son recordatorios cortos, no un lugar para escribir apuntes.
const MAXIMO_POR_CARPETA = 20;

export class CrearNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearNotaDTO): Promise<NotaRapida> {
    const [{ cantidad }] = await this.persistencia.ejecutar(
      `SELECT COUNT(*)::int AS cantidad FROM notas_rapidas WHERE id_usuario = $1 AND id_nodo = $2`,
      [datos.usuarioId, datos.idNodo]
    );
    if (cantidad >= MAXIMO_POR_CARPETA) {
      throw new Error(`Ya tenés ${MAXIMO_POR_CARPETA} notas en esta carpeta. Borrá alguna para agregar otra.`);
    }
    const [fila] = await this.persistencia.ejecutar<FilaNota>(
      `INSERT INTO notas_rapidas (id_usuario, id_nodo, texto, color)
       VALUES ($1, $2, $3, $4)
       RETURNING id_nota, id_nodo, texto, color, pos_x, pos_y, fecha_creacion`,
      [datos.usuarioId, datos.idNodo, datos.texto, datos.color]
    );
    return materializarNota(fila);
  }
}
