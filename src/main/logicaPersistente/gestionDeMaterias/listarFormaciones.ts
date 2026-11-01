import { Persistencia } from '../../persistencia/persistencia';
import { Formacion } from './entidades';
import { materializarFormacion } from './materializador';
import { UsuarioDTO } from './dto';

// Lista las formaciones del usuario en el orden en que las cargó.
export class ListarFormaciones {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO): Promise<Formacion[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM formacion WHERE id_usuario = $1 ORDER BY fecha_creacion, id_formacion`,
      [datos.usuarioId]
    );
    return filas.map(materializarFormacion);
  }
}
