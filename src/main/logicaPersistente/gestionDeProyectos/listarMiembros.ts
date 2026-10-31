import { ListarMiembrosDTOSchema, ListarMiembrosDTO } from './dto';
import { ProyectoMiembro } from './entidades';
import { IPersistenciaProyectos, ISincronizador, MiembroRemoto } from './interfacesSincronizacion';
import { materializarMiembro } from './materializador';
import { exigirPermiso } from './permisos';
import { asegurarConexion } from './miembrosRemotos';

export class ListarMiembros {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: ListarMiembrosDTO): Promise<ProyectoMiembro[]> {
        const dto = ListarMiembrosDTOSchema.parse(entrada);
        await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, 'miembro.listar');

        const f = await this.persistencia.ejecutar<{ id_remoto: string | null }>(
            `SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);

        // Proyecto publicado: la lista sale del servidor, que es donde están todos los miembros.
        if (f[0]?.id_remoto) {
            try {
                await asegurarConexion(this.sincronizador);
                const remotos = await this.sincronizador.listarMiembrosRemotos(f[0].id_remoto);
                return await this.conDatosLocales(dto.idProyecto, remotos.filter(m => !dto.soloActivos || m.activo));
            } catch (e) {
                console.warn('No se pudo leer la lista de miembros del servidor; se muestra la local.', e);
            }
        }
        return this.desdeLocal(dto.idProyecto, dto.soloActivos);
    }

    // Completa ids y fechas con lo que exista en esta base (el propietario, al menos).
    // Un miembro que solo existe en el servidor queda con idUsuario / idProyectoMiembro / fechaUnion en null.
    private async conDatosLocales(idProyecto: number, remotos: MiembroRemoto[]): Promise<ProyectoMiembro[]> {
        const mails = remotos.map(m => m.mail.toLowerCase());
        const locales = mails.length === 0 ? [] : await this.persistencia.ejecutar<{
            email: string; nombre: string; id_usuario: number;
            id_proyecto_miembro: number | null; fecha_union: Date | null; fecha_baja: Date | null;
        }>(
            `SELECT LOWER(u.email) AS email, COALESCE(NULLIF(u.apodo, ''), u.nombre) AS nombre, u.id_usuario,
                    pm.id_proyecto_miembro, pm.fecha_union, pm.fecha_baja
             FROM usuarios u
             LEFT JOIN LATERAL (
                 SELECT id_proyecto_miembro, fecha_union, fecha_baja FROM proyecto_miembros
                 WHERE id_proyecto = $2 AND id_usuario = u.id_usuario
                 ORDER BY (fecha_baja IS NULL) DESC, id_proyecto_miembro DESC LIMIT 1
             ) pm ON true
             WHERE LOWER(u.email) = ANY($1::text[])`,
            [mails, idProyecto],
        );
        const porMail = new Map(locales.map(u => [u.email, u]));
        return remotos.map(m => {
            const mail = m.mail.toLowerCase();
            const u = porMail.get(mail);
            return {
                idProyectoMiembro: u?.id_proyecto_miembro ?? null,
                idUsuario: u?.id_usuario ?? null,
                rol: m.rol,
                nombre: u?.nombre ?? mail.split('@')[0],
                mail,
                fechaUnion: m.fechaUnion ?? u?.fecha_union ?? null,
                fechaBaja: m.fechaBaja ?? u?.fecha_baja ?? null,
                pendiente: m.pendiente,
                activo: m.activo,
            };
        });
    }

    // Sin servidor (proyecto sin publicar o sin conexión): solo lo que hay en esta base.
    private async desdeLocal(idProyecto: number, soloActivos: boolean): Promise<ProyectoMiembro[]> {
        const filas = await this.persistencia.ejecutar(
            `SELECT pm.*, COALESCE(NULLIF(u.apodo, ''), u.nombre) AS nombre_usuario, u.email
             FROM proyecto_miembros pm
             JOIN usuarios u ON u.id_usuario = pm.id_usuario
             WHERE pm.id_proyecto = $1 ${soloActivos ? 'AND pm.fecha_baja IS NULL' : ''}
             ORDER BY (pm.rol = 'propietario') DESC, pm.fecha_union, pm.id_proyecto_miembro`,
            [idProyecto],
        );
        return filas.map(materializarMiembro);
    }
}