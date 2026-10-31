import { AgregarMiembroDTOSchema, AgregarMiembroDTO } from './dto';
import { ProyectoMiembro, RolMiembro } from './entidades';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { materializarMiembro } from './materializador';
import { exigirPermiso, registrarCambio } from './permisos';

export class AgregarMiembro {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: AgregarMiembroDTO): Promise<ProyectoMiembro> {
        const dto = AgregarMiembroDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, 'miembro.invitar');

        const miembro = await this.persistencia.transaccion(async tx => {
            // El índice único parcial rechaza duplicados activos.
            // Se hace el JOIN con usuarios en la misma consulta para tener nombre y mail.
            const filas = await tx.ejecutar(
                `WITH nuevo AS (
                     INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol)
                     VALUES ($1, $2, $3)
                     RETURNING *
                 )
                 SELECT nuevo.*, COALESCE(NULLIF(u.apodo, ''), u.nombre) AS nombre_usuario, u.email
                 FROM nuevo
                 JOIN usuarios u ON u.id_usuario = nuevo.id_usuario`,
                [dto.idProyecto, dto.idUsuarioNuevo, dto.rol],
            );
            const fila = filas[0];
            await registrarCambio(
                tx, dto.idProyecto, 'miembro', fila.id_proyecto_miembro, 'crear',
                { idUsuario: fila.id_usuario, rol: fila.rol },
            );
            return materializarMiembro(fila);
        });

        await this.notificarSiHayConexion(dto.idProyecto, dto.idUsuarioNuevo, dto.rol);
        return miembro;
    }

    // Mejor esfuerzo: si falla, SincronizarProyecto lo reintenta desde la cola (la alta es idempotente).
    private async notificarSiHayConexion(idProyecto: number, idUsuario: number, rol: RolMiembro) {
        if (!this.sincronizador.estaConectado()) return;
        try {
            const f = await this.persistencia.ejecutar(`SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
            if (f[0]?.id_remoto) await this.sincronizador.notificarMiembro(f[0].id_remoto, idUsuario, 'alta', rol);
        } catch (e) {
            console.warn('Alta de miembro pendiente de notificar; se reintentará al sincronizar.', e);
        }
    }
}