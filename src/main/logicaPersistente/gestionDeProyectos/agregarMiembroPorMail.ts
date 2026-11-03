import { createHash } from 'node:crypto';
import { InvitarMiembroDTOSchema, InvitarMiembroDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirPermiso } from './permisos';
import { asegurarConexion, buscarMiembroRemoto } from './miembrosRemotos';
import { enviarInvitacionProyecto } from '../../servicios/correo'; // ajustá la ruta

// Borrá esto si nada más lo importa (lo usaba el flujo viejo por código).
export const hashCodigo = (codigo: string): string =>
    createHash('sha256').update(codigo.trim().toUpperCase()).digest('hex');

export interface InvitacionEnviada {
    pendiente: true;
    mail: string;
}

// Da de alta el mail en el servidor y le manda el enlace. Ya no se guarda nada local:
// la lista de miembros (con su estado "pendiente") sale de Supabase.
export class AgregarMiembroPorMail {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: InvitarMiembroDTO): Promise<InvitacionEnviada> {
        const dto = InvitarMiembroDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, 'miembro.invitar');

        const mailInvitado = dto.mail.trim().toLowerCase();

        const datos = await this.persistencia.ejecutar(
            `SELECT p.nombre AS proyecto, p.id_remoto, p.enlace,
                    COALESCE(NULLIF(u.apodo, ''), u.nombre) AS invitador
             FROM proyectos p, usuarios u
             WHERE p.id_proyecto = $1 AND u.id_usuario = $2`,
            [dto.idProyecto, dto.idUsuarioSolicitante],
        );
        if (!datos[0]) throw new Error('Proyecto inexistente');
        const { proyecto, id_remoto: idRemoto, enlace, invitador } = datos[0];
        if (!idRemoto || !enlace) {
            throw new Error('El proyecto todavía no se publicó en el servidor. Esperá unos segundos y volvé a intentar.');
        }

        await asegurarConexion(this.sincronizador);

        // Ya unido: error. Pendiente: se permite reenviar el enlace (y ajustar el rol).
        const previo = await buscarMiembroRemoto(this.sincronizador, idRemoto, mailInvitado);
        if (previo?.activo && !previo.pendiente) throw new Error('Ese usuario ya es miembro del proyecto');
        const yaEstabaPendiente = !!previo?.activo && previo.pendiente;

        await this.sincronizador.gestionarMiembroPorMail(idRemoto, mailInvitado, 'alta', dto.rol);

        // Si el mail no sale se deshace el alta, salvo que ya estuviera pendiente de antes.
        try {
            await enviarInvitacionProyecto(mailInvitado, proyecto, invitador, enlace);
        } catch {
            if (!yaEstabaPendiente) {
                await this.sincronizador.gestionarMiembroPorMail(idRemoto, mailInvitado, 'baja').catch(() => undefined);
            }
            throw new Error('No se pudo enviar el mail. Revisá la dirección e intentá de nuevo.');
        }

        return { pendiente: true, mail: mailInvitado };
    }
}