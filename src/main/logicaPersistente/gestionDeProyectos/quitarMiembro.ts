import { QuitarMiembroDTOSchema, QuitarMiembroDTO } from './dto';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { exigirRol, obtenerRolActivo, registrarCambio } from './permisos';

export class QuitarMiembro {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: QuitarMiembroDTO): Promise<void> {
        const dto = QuitarMiembroDTOSchema.parse(entrada);
        const abandona = dto.idUsuarioSolicitante === dto.idUsuarioMiembro;

        if (!abandona) await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, ['propietario']);

        const rolObjetivo = await obtenerRolActivo(this.persistencia, dto.idProyecto, dto.idUsuarioMiembro);
        if (!rolObjetivo) throw new Error('El usuario no es miembro activo del proyecto');
        if (rolObjetivo === 'propietario') throw new Error('El propietario no puede darse de baja del proyecto');

        await this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `UPDATE proyecto_miembros SET fecha_baja = NOW()
                 WHERE id_proyecto = $1 AND id_usuario = $2 AND fecha_baja IS NULL
                 RETURNING id_proyecto_miembro`,
                [dto.idProyecto, dto.idUsuarioMiembro],
            );
            await registrarCambio(tx, dto.idProyecto, 'miembro', filas[0].id_proyecto_miembro, 'eliminar',
                { idUsuario: dto.idUsuarioMiembro });
        });
    }
}