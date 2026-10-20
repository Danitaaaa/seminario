import { SincronizarProyectoDTOSchema, SincronizarProyectoDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { materializarCambio } from './materializador';
import { exigirRol } from './permisos';

export interface ResultadoSincronizacion { enviados: number; recibidos: number; versionServidor: number; }

// Aplica un cambio remoto sobre la BD local. Se inyecta para no acoplar este módulo
// con las implementaciones de nodos/archivos (que tienen su propia lógica).
export type AplicadorCambios = (idProyecto: number, cambio: import('./entidades').CambioPendiente) => Promise<void>;

export class SincronizarProyecto {
    constructor(
        private persistencia: IPersistenciaProyectos,
        private sincronizador: ISincronizador,
        private aplicarCambioRemoto: AplicadorCambios,
    ) {}

    async ejecutar(entrada: SincronizarProyectoDTO): Promise<ResultadoSincronizacion> {
        const dto = SincronizarProyectoDTOSchema.parse(entrada);
        await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuario, ['propietario', 'editor']);
        if (!this.sincronizador.estaConectado()) throw new Error('Sin conexión con el servidor de sincronización');

        const [proy] = await this.persistencia.ejecutar(
            `SELECT id_remoto, nombre, version_servidor FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
        if (!proy) throw new Error('Proyecto inexistente');

        // Primera vez: publicar el proyecto y guardar id remoto + enlace de invitación
        let idRemoto: string | null = proy.id_remoto;
        if (!idRemoto) {
            const estado = await this.sincronizador.publicarProyecto(dto.idProyecto, proy.nombre);
            idRemoto = estado.idRemoto;
            await this.persistencia.ejecutar(
                `UPDATE proyectos SET id_remoto = $1, enlace = $2 WHERE id_proyecto = $3`,
                [estado.idRemoto, estado.enlace, dto.idProyecto]);
        }

        // 1. Subir cambios locales pendientes
        const pendientes = (await this.persistencia.ejecutar(
            `SELECT * FROM cola_sincronizacion
             WHERE id_proyecto = $1 AND fecha_envio IS NULL ORDER BY id_cambio`, [dto.idProyecto]
        )).map(materializarCambio);

        let versionServidor = 0;
        if (pendientes.length > 0) {
            versionServidor = await this.sincronizador.enviarCambios(idRemoto, pendientes);
            await this.persistencia.ejecutar(
                `UPDATE cola_sincronizacion SET fecha_envio = NOW() WHERE id_cambio = ANY($1::bigint[])`,
                [pendientes.map(c => c.id)]);
        }

        // 2. Bajar cambios de otros miembros y aplicarlos en orden
        const remotos = await this.sincronizador.recibirCambios(idRemoto, proy.version_servidor);
        for (const cambio of remotos.cambios) await this.aplicarCambioRemoto(dto.idProyecto, cambio);

        // Nota: aplicarCambioRemoto NO debe volver a registrar el cambio en cola_sincronizacion.
        const versionFinal = Math.max(versionServidor, remotos.versionServidor);

        await this.persistencia.ejecutar(
            `UPDATE proyectos SET ultima_sincronizacion = NOW(), version_servidor = $1 WHERE id_proyecto = $2`,
            [versionFinal, dto.idProyecto]);

        return { enviados: pendientes.length, recibidos: remotos.cambios.length, versionServidor: versionFinal };
    }
}