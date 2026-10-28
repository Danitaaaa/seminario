import { ListarInvitacionesDTOSchema, ListarInvitacionesDTO } from './dto';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { exigirRol } from './permisos';

// La invitación se liga al mail: el invitado puede no estar registrado en esta base.
export interface InvitacionPendiente {
    idInvitacion: number;
    mail: string;
    rol: 'editor' | 'lector';
    fechaVencimiento: Date;
}

export class ListarInvitaciones {
    constructor(private persistencia: IPersistenciaProyectos) {}

    async ejecutar(entrada: ListarInvitacionesDTO): Promise<InvitacionPendiente[]> {
        const dto = ListarInvitacionesDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, ['propietario']);

        const filas = await this.persistencia.ejecutar(
            `SELECT id_invitacion, mail_invitado, rol, fecha_vencimiento
             FROM proyecto_invitaciones
             WHERE id_proyecto = $1 AND fecha_vencimiento > NOW()
             ORDER BY fecha_creacion`,
            [dto.idProyecto],
        );
        return filas.map(f => ({
            idInvitacion: f.id_invitacion,
            mail: f.mail_invitado,
            rol: f.rol,
            fechaVencimiento: f.fecha_vencimiento,
        }));
    }
}