import { Persistencia } from '../../persistencia/persistencia';
import { MaterialIA } from './entidades';
import { materializarMaterialIA } from './materializador';

// Un material generado con IA del usuario. Si no existe o es de otro usuario, da error.
export class ObtenerMaterialIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idMaterialIA: number): Promise<MaterialIA> {
    const filas = await this.persistencia.ejecutar(
      `SELECT m.*, a.nombre AS nombre_archivo
       FROM materiales_ia m
       LEFT JOIN archivos a ON a.id_archivo = m.id_archivo
       WHERE m.id_material_ia = $1 AND m.id_usuario = $2`,
      [idMaterialIA, idUsuario],
    );
    if (!filas[0]) throw new Error('No se encontró ese material. Puede que se haya eliminado.');
    return materializarMaterialIA(filas[0]);
  }
}
