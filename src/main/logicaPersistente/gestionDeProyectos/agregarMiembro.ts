import { AgregarMiembroDTOSchema, AgregarMiembroDTO } from './dto';
import { ProyectoMiembro } from './entidades';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { materializarMiembro } from './materializador';
import { exigirRol, registrarCambio } from './permisos';

export class AgregarMiembro {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: AgregarMiembroDTO): Promise<ProyectoMiembro> {
        const dto = AgregarMiembroDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, ['propietario']);

        const miembro = await this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol) VALUES ($1, $2, $3) RETURNING *`,
                [dto.idProyecto, dto.idUsuarioNuevo, dto.rol],
            ); // el índice único parcial rechaza duplicados activos
            const m = materializarMiembro(filas[0]);
            await registrarCambio(tx, dto.idProyecto, 'miembro', m.idProyectoMiembro, 'crear', { idUsuario: m.idUsuario, rol: m.rol });
            return m;
        });

        await this.notificarSiHayConexion(dto.idProyecto, dto.idUsuarioNuevo);
        return miembro;
    }

    private async notificarSiHayConexion(idProyecto: number, idUsuario: number) {
        if (!this.sincronizador.estaConectado()) return; // se enviará con la cola pendiente
        const f = await this.persistencia.ejecutar(`SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
        if (f[0]?.id_remoto) await this.sincronizador.notificarMiembro(f[0].id_remoto, idUsuario, 'alta');
    }
}