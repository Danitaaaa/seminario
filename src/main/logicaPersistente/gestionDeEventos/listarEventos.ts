import { Persistencia } from '../../persistencia/persistencia';
import { Evento } from './entidades';
import { materializarEvento } from './materializador';
import { ListarEventosDTO } from './dto';

// Lista los eventos visibles para el usuario ordenados por fecha ascendente:
// - Sin idProyecto: sus eventos personales + los de proyectos donde es miembro activo.
// - Con idProyecto: solo los de ese proyecto (si es miembro activo).
export class ListarEventos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: ListarEventosDTO): Promise<Evento[]> {
    const valores: unknown[] = [datos.usuarioId];
    const condiciones: string[] = [];

    const esMiembroActivo = `e.id_proyecto IN (
      SELECT id_proyecto FROM proyecto_miembros
      WHERE id_usuario = $1 AND fecha_baja IS NULL)`;

    if (datos.idProyecto !== undefined) {
      valores.push(datos.idProyecto);
      condiciones.push(`e.id_proyecto = $${valores.length}`);
      condiciones.push(esMiembroActivo);
    } else {
      condiciones.push(`((e.id_proyecto IS NULL AND e.usuario_id = $1) OR ${esMiembroActivo})`);
    }

    if (datos.desde) {
      valores.push(datos.desde);
      condiciones.push(`e.fecha >= $${valores.length}`);
    }
    if (datos.hasta) {
      valores.push(datos.hasta);
      condiciones.push(`e.fecha <= $${valores.length}`);
    }

    const filas = await this.persistencia.ejecutar(
      `SELECT e.*, p.nombre AS nombre_proyecto
       FROM eventos e
       LEFT JOIN proyectos p ON p.id_proyecto = e.id_proyecto
       WHERE ${condiciones.join(' AND ')}
       ORDER BY e.fecha ASC`,
      valores
    );
    return filas.map(materializarEvento);
  }
}