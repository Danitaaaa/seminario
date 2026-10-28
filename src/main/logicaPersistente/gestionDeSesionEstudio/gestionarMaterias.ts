import { Persistencia } from '../../persistencia/persistencia';
import { MateriaConUso } from './entidades';
import { ModificarMateriaDTO, RegistrarMateriaDTO } from './dto';

// Códigos de Postgres: nombre repetido y fila referenciada por otra tabla.
const VIOLACION_UNICIDAD = '23505';
const VIOLACION_REFERENCIA = '23503';

// Alta, listado, edición y baja de materias (modal "Materias" de la pestaña de sesiones).
// Una materia que tiene sesiones no se puede eliminar: primero hay que cambiar o borrar esas sesiones.
export class GestionarMaterias {
  constructor(private readonly persistencia: Persistencia) {}

  // Lista las materias con cuántas sesiones del usuario las usan (para avisar antes de eliminar).
  async listar(idUsuario: number): Promise<MateriaConUso[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT m.id_materia, m.nombre,
              COUNT(s.id_sesion_estudio) FILTER (WHERE s.id_usuario = $1)::int AS cantidad_sesiones
         FROM materia m
         LEFT JOIN sesion_estudio s ON s.id_materia = m.id_materia
        GROUP BY m.id_materia, m.nombre
        ORDER BY m.nombre`,
      [idUsuario]
    );
    return filas.map((f: any) => this.materializar(f));
  }

  async registrar(datos: RegistrarMateriaDTO): Promise<MateriaConUso> {
    try {
      const filas = await this.persistencia.ejecutar(
        `INSERT INTO materia (nombre) VALUES ($1) RETURNING id_materia, nombre, 0 AS cantidad_sesiones`,
        [datos.nombre]
      );
      return this.materializar(filas[0]);
    } catch (error: any) {
      throw this.traducir(error);
    }
  }

  // Cambia el nombre. Las sesiones de esa materia muestran el nombre nuevo automáticamente.
  async modificar(idUsuario: number, datos: ModificarMateriaDTO): Promise<MateriaConUso> {
    try {
      const filas = await this.persistencia.ejecutar(
        `UPDATE materia m
            SET nombre = $2
          WHERE m.id_materia = $1
         RETURNING m.id_materia, m.nombre,
                   (SELECT COUNT(*)::int FROM sesion_estudio s
                     WHERE s.id_materia = m.id_materia AND s.id_usuario = $3) AS cantidad_sesiones`,
        [datos.idMateria, datos.nombre, idUsuario]
      );
      if (filas.length === 0) throw new Error('La materia no existe.');
      return this.materializar(filas[0]);
    } catch (error: any) {
      throw this.traducir(error);
    }
  }

  async eliminar(idMateria: number): Promise<void> {
    try {
      const filas = await this.persistencia.ejecutar(
        `DELETE FROM materia WHERE id_materia = $1 RETURNING id_materia`,
        [idMateria]
      );
      if (filas.length === 0) throw new Error('La materia no existe.');
    } catch (error: any) {
      if (error?.code === VIOLACION_REFERENCIA) {
        const uso = await this.persistencia.ejecutar(
          `SELECT COUNT(*)::int AS cantidad FROM sesion_estudio WHERE id_materia = $1`,
          [idMateria]
        );
        const cantidad: number = uso[0]?.cantidad ?? 0;
        throw new Error(
          `No se puede eliminar: ${cantidad === 1 ? 'hay 1 sesión' : `hay ${cantidad} sesiones`} con esta materia. ` +
          'Cambiales la materia o eliminalas primero.'
        );
      }
      throw this.traducir(error);
    }
  }

  private traducir(error: any): Error {
    if (error?.code === VIOLACION_UNICIDAD) return new Error('Ya existe una materia con ese nombre.');
    return error instanceof Error ? error : new Error(String(error));
  }

  private materializar(fila: any): MateriaConUso {
    return { idMateria: fila.id_materia, nombre: fila.nombre, cantidadSesiones: Number(fila.cantidad_sesiones ?? 0) };
  }
}
