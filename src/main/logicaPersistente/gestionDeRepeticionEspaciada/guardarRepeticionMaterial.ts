import { Persistencia } from '../../persistencia/Persistencia';
import { GuardarRepeticionMaterialDTO } from './dto';
import { RepeticionMaterial } from './entidades';

// Caso de uso para habilitar o actualizar el repaso de un material.
export class GuardarRepeticionMaterial {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(
    datos: GuardarRepeticionMaterialDTO
): Promise<void> {

// La clave usuario-material permite actualizar la configuración existente.
await this.persistencia.ejecutar(
        `
        INSERT INTO repeticiones_material
        (
            id_usuario,
            id_nodo,
            intervalo_dias,
            proxima_revision
        )
        VALUES
        (
            $1,
            $2,
            $3,
            CURRENT_DATE + $3::integer
        )
        ON CONFLICT
        (
            id_usuario,
            id_nodo
        )
        DO UPDATE SET
            intervalo_dias =
                EXCLUDED.intervalo_dias,

            proxima_revision =
                EXCLUDED.proxima_revision
        `,
        [
            datos.usuarioId,
            datos.nodoId,
            datos.intervaloDias
        ]
    );
}
}
