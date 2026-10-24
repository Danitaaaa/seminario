import { Persistencia } from '../../persistencia/persistencia';
import { Materia } from './entidades';
import { RegistrarMateriaDTO } from './dto';
import { materializarMateria } from './materializador';

// Código de Postgres para violación de índice único.
const VIOLACION_UNICIDAD = '23505';

// Registra una materia nueva para poder asociarla a las sesiones ("Registrar materia +").
// Es el alta mínima (solo el nombre); el apartado completo de Materias se arma aparte.
export class RegistrarMateria {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: RegistrarMateriaDTO): Promise<Materia> {
    try {
      const filas = await this.persistencia.ejecutar(
        `INSERT INTO materia (nombre) VALUES ($1) RETURNING id_materia, nombre`,
        [datos.nombre]
      );
      return materializarMateria(filas[0]);
    } catch (error: any) {
      if (error?.code === VIOLACION_UNICIDAD) {
        throw new Error('Ya existe una materia con ese nombre.');
      }
      throw error;
    }
  }
}
