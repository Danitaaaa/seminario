import { Persistencia } from '../../persistencia/persistencia';

// Elimina un material generado con IA del usuario (y, si es un cuestionario, sus intentos).
export class EliminarMaterialIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idMaterialIA: number): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `DELETE FROM materiales_ia WHERE id_material_ia = $1 AND id_usuario = $2 RETURNING id_material_ia`,
      [idMaterialIA, idUsuario],
    );
    if (!filas[0]) throw new Error('No se encontró ese material. Puede que ya se haya eliminado.');
  }
}
