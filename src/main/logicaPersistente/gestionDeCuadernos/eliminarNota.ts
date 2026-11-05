import { Persistencia } from '../../persistencia/persistencia';
import { NotaDTO } from './dto';

// Elimina una nota del usuario.
export class EliminarNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: NotaDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM nota n
        USING materia m, formacion f
        WHERE n.id_nota = $1 AND m.id_materia = n.id_materia AND f.id_formacion = m.id_formacion AND f.id_usuario = $2
       RETURNING n.id_nota`,
      [datos.idNota, datos.usuarioId]
    );
    if (filas.length === 0) throw new Error('La nota no existe.');
  }
}
