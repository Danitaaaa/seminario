import { Persistencia } from '../../persistencia/persistencia';
import { Correlativa } from './entidades';
import { materializarCorrelativa } from './materializador';
import { FormacionDTO } from './dto';

// Lista las correlatividades de todas las materias de una formación del usuario.
export class ListarCorrelativas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: FormacionDTO): Promise<Correlativa[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT c.id_materia, c.id_requisito
         FROM materia_correlativa c
         JOIN materia m ON m.id_materia = c.id_materia
         JOIN formacion f ON f.id_formacion = m.id_formacion
        WHERE f.id_formacion = $1 AND f.id_usuario = $2`,
      [datos.idFormacion, datos.usuarioId]
    );
    return filas.map(materializarCorrelativa);
  }
}
