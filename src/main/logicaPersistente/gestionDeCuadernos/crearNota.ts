import { Persistencia } from '../../persistencia/persistencia';
import { Nota } from './entidades';
import { materializarNota } from './materializador';
import { CrearNotaDTO } from './dto';
import { estadoPorNota } from './reglasNotas';

// Agrega una nota al cuaderno de una materia del usuario.
export class CrearNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearNotaDTO): Promise<Nota> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO nota (id_materia, tipo, nombre, fecha, nota, estado)
       SELECT m.id_materia, $3, $4, $5, $6, $7
         FROM materia m JOIN formacion f ON f.id_formacion = m.id_formacion
        WHERE m.id_materia = $1 AND f.id_usuario = $2
       RETURNING id_nota, id_materia, tipo, nombre, to_char(fecha, 'YYYY-MM-DD') AS fecha, nota, estado`,
      [datos.idMateria, datos.usuarioId, datos.tipo, datos.nombre, datos.fecha, datos.nota,
        datos.estado ?? estadoPorNota(datos.nota)]
    );
    if (filas.length === 0) throw new Error('La materia no existe.');
    return materializarNota(filas[0]);
  }
}
