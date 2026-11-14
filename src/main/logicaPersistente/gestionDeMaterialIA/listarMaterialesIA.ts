import { Persistencia } from '../../persistencia/persistencia';
import type { TipoMaterialIA } from '../../logicaNoPersistente/ia/tipos';
import { MaterialIA } from './entidades';
import { materializarMaterialIA } from './materializador';

// Lista el material generado por el usuario, el más nuevo primero.
// Opcional: solo el de un archivo y/o solo un tipo (los resúmenes, los cuestionarios...).
export class ListarMaterialesIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, filtros: { idArchivo?: number; tipo?: TipoMaterialIA } = {}): Promise<MaterialIA[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT m.*, a.nombre AS nombre_archivo
       FROM materiales_ia m
       LEFT JOIN archivos a ON a.id_archivo = m.id_archivo
       WHERE m.id_usuario = $1
         AND ($2::int IS NULL OR m.id_archivo = $2)
         AND ($3::varchar IS NULL OR m.tipo = $3)
       ORDER BY m.fecha_creacion DESC`,
      [idUsuario, filtros.idArchivo ?? null, filtros.tipo ?? null],
    );
    return filas.map(materializarMaterialIA);
  }
}
