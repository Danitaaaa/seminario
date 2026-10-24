import { Persistencia } from '../../persistencia/persistencia';
import { MarcarLeidasDTO } from './dto';

// Marca como leídos algunos avisos, o todos si no se pasan ids. Solo toca los del propio usuario.
export class MarcarLeidas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MarcarLeidasDTO): Promise<void> {
    if (datos.ids) {
      if (!datos.ids.length) return;
      await this.persistencia.ejecutar(
        `UPDATE notificaciones SET leida = TRUE WHERE usuario_id = $1 AND id = ANY($2::int[])`,
        [datos.usuarioId, datos.ids]
      );
      return;
    }
    await this.persistencia.ejecutar(
      `UPDATE notificaciones SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE`,
      [datos.usuarioId]
    );
  }
}