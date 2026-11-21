import { Persistencia } from '../../persistencia/persistencia';
import { ListarNotasDTO } from './dto';
import { NotaRapida } from './entidades';
import { materializarNota, type FilaNota } from './materializador';

// Notas del usuario en una carpeta, de la más vieja a la más nueva.
export class ListarNotas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ListarNotasDTO): Promise<NotaRapida[]> {
    const filas = await this.persistencia.ejecutar<FilaNota>(
      `SELECT id_nota, id_nodo, texto, color, pos_x, pos_y, fecha_creacion
         FROM notas_rapidas
        WHERE id_usuario = $1 AND id_nodo = $2
        ORDER BY fecha_creacion, id_nota`,
      [datos.usuarioId, datos.idNodo]
    );
    return filas.map(materializarNota);
  }
}
