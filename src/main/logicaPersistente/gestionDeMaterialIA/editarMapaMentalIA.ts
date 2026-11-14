import { Persistencia } from '../../persistencia/persistencia';
import { mapaMentalSchema } from '../../logicaNoPersistente/ia/esquemas';
import { MaterialIA } from './entidades';
import { ObtenerMaterialIA } from './obtenerMaterialIA';

// Guarda los cambios que el usuario le hizo a un mapa mental (texto de las ideas, ideas nuevas
// o eliminadas, título). Se valida con el mismo esquema que lo que genera la IA.
export class EditarMapaMentalIA {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly obtenerMaterial: ObtenerMaterialIA,
  ) {}

  async ejecutar(idUsuario: number, idMaterialIA: number, contenido: unknown): Promise<MaterialIA> {
    const actual = await this.obtenerMaterial.ejecutar(idUsuario, idMaterialIA);
    if (actual.tipo !== 'mapaMental') throw new Error('Solo se pueden editar los mapas mentales.');

    const validado = mapaMentalSchema.safeParse(contenido);
    if (!validado.success) throw new Error(validado.error.issues[0]?.message ?? 'El mapa mental no es válido.');

    await this.persistencia.ejecutar(
      `UPDATE materiales_ia SET titulo = $3, contenido = $4::jsonb
       WHERE id_material_ia = $1 AND id_usuario = $2`,
      [idMaterialIA, idUsuario, validado.data.titulo, JSON.stringify(validado.data)],
    );
    return this.obtenerMaterial.ejecutar(idUsuario, idMaterialIA);
  }
}
