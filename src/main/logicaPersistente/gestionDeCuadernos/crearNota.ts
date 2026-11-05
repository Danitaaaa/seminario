import { Persistencia } from '../../persistencia/persistencia';
import { Nota } from './entidades';
import { materializarNota } from './materializador';
import { CrearNotaDTO } from './dto';
import { estadoPorNota } from './reglasNotas';

// Agrega una nota a un cuaderno del usuario.
export class CrearNota {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearNotaDTO): Promise<Nota> {
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO nota (id_cuaderno, tipo, nombre, fecha, nota, estado)
       SELECT c.id_cuaderno, $3, $4, $5, $6, $7 FROM cuaderno c WHERE c.id_cuaderno = $1 AND c.id_usuario = $2
       RETURNING id_nota, id_cuaderno, tipo, nombre, to_char(fecha, 'YYYY-MM-DD') AS fecha, nota, estado`,
      [datos.idCuaderno, datos.usuarioId, datos.tipo, datos.nombre, datos.fecha, datos.nota,
        datos.estado ?? estadoPorNota(datos.nota)]
    );
    if (filas.length === 0) throw new Error('El cuaderno no existe.');
    return materializarNota(filas[0]);
  }
}
