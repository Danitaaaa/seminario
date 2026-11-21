import { Persistencia } from '../../persistencia/persistencia';
import { ModificarNotaDTO } from './dto';
import { NotaRapida } from './entidades';
import { materializarNota, type FilaNota } from './materializador';

// Cambia el texto, el color o el lugar. Solo la dueña de la nota puede tocarla.
export class ModificarNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarNotaDTO): Promise<NotaRapida> {
    const filas = await this.persistencia.ejecutar<FilaNota>(
      `UPDATE notas_rapidas
          SET texto = COALESCE($3, texto), color = COALESCE($4, color),
              pos_x = COALESCE($5, pos_x), pos_y = COALESCE($6, pos_y)
        WHERE id_nota = $1 AND id_usuario = $2
        RETURNING id_nota, id_nodo, texto, color, pos_x, pos_y, fecha_creacion`,
      [datos.idNota, datos.usuarioId, datos.texto ?? null, datos.color ?? null, datos.posX ?? null, datos.posY ?? null]
    );
    if (!filas.length) throw new Error('La nota no existe.');
    return materializarNota(filas[0]);
  }
}
