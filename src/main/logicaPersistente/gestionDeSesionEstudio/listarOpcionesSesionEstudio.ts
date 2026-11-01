import { Persistencia } from '../../persistencia/persistencia';
import { OpcionesSesionEstudio } from './entidades';
import { materializarMateria, materializarTipoMetodoEstudio } from './materializador';

// Devuelve las materias del usuario y los tipos de método de estudio para armar el formulario.
// Las materias vienen con su grupo ("Formación · 1er año") para mostrarlas agrupadas;
// las que se cargaron antes del módulo Materias no tienen formación y quedan sin grupo.
export class ListarOpcionesSesionEstudio {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number): Promise<OpcionesSesionEstudio> {
    const [materias, metodos] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT m.id_materia, m.nombre, m.estado,
                CASE WHEN f.id_formacion IS NULL THEN NULL
                     WHEN m.anio IS NULL THEN f.nombre
                     ELSE f.nombre || ' · ' || m.anio || '° año' END AS grupo
           FROM materia m
           LEFT JOIN formacion f ON f.id_formacion = m.id_formacion
          WHERE m.id_formacion IS NULL OR f.id_usuario = $1
          ORDER BY f.fecha_creacion NULLS LAST, m.anio NULLS LAST, m.nombre`,
        [idUsuario]
      ),
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
