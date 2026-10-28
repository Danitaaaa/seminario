import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { Evento } from './entidades';
import { materializarEvento } from './materializador';

// Busca un evento por id (con el nombre de su proyecto, si tiene). Lanza error si no existe.
export async function buscarEvento(db: IPersistenciaProyectos, id: number): Promise<Evento> {
  const filas = await db.ejecutar(
    `SELECT e.*, p.nombre AS nombre_proyecto
     FROM eventos e
     LEFT JOIN proyectos p ON p.id_proyecto = e.id_proyecto
     WHERE e.id = $1`,
    [id]
  );
  if (filas.length === 0) throw new Error('El evento no existe');
  return materializarEvento(filas[0]);
}