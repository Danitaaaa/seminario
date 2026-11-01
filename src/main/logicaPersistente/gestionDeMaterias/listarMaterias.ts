import { Persistencia } from '../../persistencia/persistencia';
import { MateriaFormacion } from './entidades';
import { materializarMateria } from './materializador';
import { FormacionDTO } from './dto';

// Lista las materias de una formación del usuario, ordenadas por año y cuatrimestre.
export class ListarMaterias {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: FormacionDTO): Promise<MateriaFormacion[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT m.* FROM materia m
         JOIN formacion f ON f.id_formacion = m.id_formacion
        WHERE f.id_formacion = $1 AND f.id_usuario = $2
        ORDER BY m.anio NULLS LAST,
                 CASE m.cuatrimestre WHEN 'primero' THEN 1 WHEN 'segundo' THEN 2 WHEN 'anual' THEN 3 ELSE 4 END,
                 m.nombre`,
      [datos.idFormacion, datos.usuarioId]
    );
    return filas.map(materializarMateria);
  }
}
