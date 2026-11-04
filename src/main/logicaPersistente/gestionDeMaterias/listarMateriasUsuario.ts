import { Persistencia } from '../../persistencia/persistencia';
import { UsuarioDTO } from './dto';

export interface OpcionMateria {
  idMateria: number;
  nombre: string;
  formacion: string; // nombre de la formación, para agrupar el filtro por carrera
  grupo: string;     // "Formación · 1° año", para agruparlas en un selector
  anio: number | null;
  estado: string;
}

// Todas las materias del usuario, de todas sus formaciones, para elegir una en un selector (ej. Material).
export class ListarMateriasUsuario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: UsuarioDTO): Promise<OpcionMateria[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT m.id_materia, m.nombre, m.anio, m.estado, f.nombre AS formacion,
              f.nombre || CASE WHEN m.anio IS NULL THEN '' ELSE ' · ' || m.anio || '° año' END AS grupo
         FROM materia m
         JOIN formacion f ON f.id_formacion = m.id_formacion
        WHERE f.id_usuario = $1
        ORDER BY f.fecha_creacion, f.id_formacion, m.anio NULLS LAST, m.nombre`,
      [datos.usuarioId]
    );
    return filas.map((f: any) => ({ idMateria: f.id_materia, nombre: f.nombre, formacion: f.formacion, grupo: f.grupo, anio: f.anio, estado: f.estado }));
  }
}
