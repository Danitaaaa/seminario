import { CambiarRolMiembroDTOSchema, CambiarRolMiembroDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirPermiso } from './permisos';
import { asegurarConexion, buscarMiembroRemoto, idRemotoDe, mailDelMiembro } from './miembrosRemotos';

export class CambiarRolMiembro {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: CambiarRolMiembroDTO): Promise<{ mail: string; rol: 'editor' | 'lector' }> {
        const dto = CambiarRolMiembroDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, 'miembro.cambiarRol');

        const mail = await mailDelMiembro(this.persistencia, dto);
        const idRemoto = await idRemotoDe(this.persistencia, dto.idProyecto);
        await asegurarConexion(this.sincronizador);

        const actual = await buscarMiembroRemoto(this.sincronizador, idRemoto, mail);
        if (!actual || !actual.activo) throw new Error('El usuario no es miembro activo del proyecto');
        if (actual.rol === 'propietario') throw new Error('No se puede cambiar el rol del propietario');

        // En el servidor 'alta' sobre un miembro existente solo cambia el rol (y reactivaría a un dado de baja,
        // por eso se verificó antes que está activo).
        await this.sincronizador.gestionarMiembroPorMail(idRemoto, mail, 'alta', dto.rol);

        // Espejo local, solo si ese usuario también existe en esta base.
        await this.persistencia.ejecutar(
            `UPDATE proyecto_miembros pm SET rol = $3
             FROM usuarios u
             WHERE u.id_usuario = pm.id_usuario AND pm.id_proyecto = $1 AND LOWER(u.email) = $2
               AND pm.fecha_baja IS NULL`,
            [dto.idProyecto, mail, dto.rol],
        );
        return { mail, rol: dto.rol };
    }
}