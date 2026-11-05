import { Persistencia } from '../../persistencia/persistencia';
import { Nota } from './entidades';
import { materializarNota } from './materializador';
import { ModificarNotaDTO } from './dto';
import { estadoPorNota } from './reglasNotas';

// Cambia una nota. Si no se elige el estado a mano, se recalcula con la nota.
export class ModificarNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ModificarNotaDTO): Promise<Nota> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE nota n
          SET tipo = $3, nombre = $4, fecha = $5, nota = $6, estado = $7
         FROM cuaderno c
        WHERE n.id_nota = $1 AND c.id_cuaderno = n.id_cuaderno AND c.id_usuario = $2
       RETURNING n.id_nota, n.id_cuaderno, n.tipo, n.nombre, to_char(n.fecha, 'YYYY-MM-DD') AS fecha, n.nota, n.estado`,
      [datos.idNota, datos.usuarioId, datos.tipo, datos.nombre, datos.fecha, datos.nota,
        datos.estado ?? estadoPorNota(datos.nota)]
    );
    if (filas.length === 0) throw new Error('La nota no existe.');
    return materializarNota(filas[0]);
  }
}
