import { Persistencia } from '../../persistencia/persistencia';
import { OpcionesSesionEstudio } from './entidades';
import { materializarMateria, materializarTipoMetodoEstudio } from './materializador';

// Devuelve las materias y los tipos de método de estudio disponibles para armar el formulario de creación.
export class ListarOpcionesSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<OpcionesSesionEstudio> {
    const [materias, metodos] = await Promise.all([
      this.persistencia.ejecutar(`SELECT id_materia, nombre FROM materia ORDER BY nombre`, []),
      this.persistencia.ejecutar(
        `SELECT id_tipo_metodo_estudio, nombre FROM tipo_metodo_estudio ORDER BY nombre`,
        []
      ),
    ]);
    return {
      materias: materias.map(materializarMateria),
      metodosEstudio: metodos.map(materializarTipoMetodoEstudio),
    };
  }
}
