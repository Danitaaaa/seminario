import { CancelarInvitacionDTOSchema, CancelarInvitacionDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirPermiso } from './permisos';

export class CancelarInvitacion {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: CancelarInvitacionDTO): Promise<void> {
        const dto = CancelarInvitacionDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, 'miembro.cancelarInvitacion');

        const filas = await this.persistencia.ejecutar(
            `SELECT i.mail_invitado, p.id_remoto
             FROM proyecto_invitaciones i JOIN proyectos p ON p.id_proyecto = i.id_proyecto
             WHERE i.id_invitacion = $1 AND i.id_proyecto = $2`,
            [dto.idInvitacion, dto.idProyecto],
        );
        if (!filas[0]) throw new Error('La invitación no existe o ya fue cancelada');

        if (filas[0].id_remoto) {
            if (!this.sincronizador.estaConectado()) await this.sincronizador.conectar();
            await this.sincronizador.gestionarMiembroPorMail(filas[0].id_remoto, filas[0].mail_invitado, 'baja');
        }
        await this.persistencia.ejecutar(
            `DELETE FROM proyecto_invitaciones WHERE id_invitacion = $1`, [dto.idInvitacion]);
    }
}