import { ListarMiembrosDTOSchema, ListarMiembrosDTO } from './dto';
import { ProyectoMiembro } from './entidades';
import { IPersistenciaProyectos, ISincronizador, MiembroRemoto } from './interfacesSincronizacion';
import { materializarMiembro } from './materializador';
import { exigirPermiso } from './permisos';
import { asegurarConexion, aplicarMiembrosRemotos } from './miembrosRemotos';

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

                // Deja proyecto_miembros al día con el servidor, para que la validación local
                // (resolverAsignado, permisos) vea a todos. Si falla, no rompe el listado.
                try {
                    await this.persistencia.transaccion(tx => aplicarMiembrosRemotos(tx, dto.idProyecto, remotos));
                } catch (e) {
                    console.warn('No se pudieron aplicar los miembros remotos a la base local.', e);
                }

                // Si el servidor no manda "activo", se considera activo.
                const filtrados = remotos.filter(m => !dto.soloActivos || m.activo !== false);
                if (filtrados.length > 0) {
                    return await this.conDatosLocales(dto.idProyecto, filtrados);
                }
                console.warn('El servidor devolvió 0 miembros; se muestra la lista local.');
            } catch (e) {
                console.warn('No se pudo leer la lista de miembros del servidor; se muestra la local.', e);
            }
        }
        return this.desdeLocal(dto.idProyecto, dto.soloActivos);
    }

    // Completa ids y fechas con lo que exista en esta base. Se parte de proyecto_miembros (no de usuarios)
    // para que también aparezcan los miembros sin usuario local, identificados por su id global.
    // Siempre devuelve idGlobalUsuario: se toma de la base o se deriva del mail.
    private async conDatosLocales(idProyecto: number, remotos: MiembroRemoto[]): Promise<ProyectoMiembro[]> {
        const mails = remotos.map(m => m.mail.toLowerCase());
        if (mails.length === 0) return [];

        const locales = await this.persistencia.ejecutar<{
            email: string; nombre: string | null; id_usuario: number | null;
            id_proyecto_miembro: number; fecha_union: Date | null; fecha_baja: Date | null;
            id_global_usuario: string | null;
        }>(
            `SELECT DISTINCT ON (LOWER(COALESCE(u.email, pm.mail)))
                    LOWER(COALESCE(u.email, pm.mail)) AS email,
                    COALESCE(NULLIF(u.apodo, ''), u.nombre) AS nombre,
                    pm.id_usuario,
                    pm.id_proyecto_miembro, pm.fecha_union, pm.fecha_baja,
                    pm.id_global_usuario::text AS id_global_usuario
             FROM proyecto_miembros pm
             LEFT JOIN usuarios u ON u.id_usuario = pm.id_usuario
             WHERE pm.id_proyecto = $2
               AND LOWER(COALESCE(u.email, pm.mail)) = ANY($1::text[])
             ORDER BY LOWER(COALESCE(u.email, pm.mail)),
                      (pm.fecha_baja IS NULL) DESC, pm.id_proyecto_miembro DESC`,
            [mails, idProyecto],
        );
        const porMail = new Map(locales.map(u => [u.email, u]));

        // Nombre de usuarios locales que no tienen fila de membresía (caso poco común).
        const usuarios = await this.persistencia.ejecutar<{ email: string; nombre: string }>(
            `SELECT LOWER(email) AS email, COALESCE(NULLIF(apodo, ''), nombre) AS nombre
             FROM usuarios WHERE LOWER(email) = ANY($1::text[])`,
            [mails],
        );
        const nombrePorMail = new Map(usuarios.map(u => [u.email, u.nombre]));

        // Respaldo: mismo cálculo que usa el trigger de proyecto_miembros.
        const globales = await this.persistencia.ejecutar<{ mail: string; id_global: string }>(
            `SELECT m AS mail, id_global_de_mail(m)::text AS id_global
             FROM unnest($1::text[]) AS m`,
            [mails],
        );
        const idGlobalPorMail = new Map(globales.map(g => [g.mail, g.id_global]));

        return remotos.map(m => {
            const mail = m.mail.toLowerCase();
            const u = porMail.get(mail);
            return {
                idProyectoMiembro: u?.id_proyecto_miembro ?? null,
                idUsuario: u?.id_usuario ?? null,
                idGlobalUsuario: u?.id_global_usuario ?? idGlobalPorMail.get(mail) ?? null,
                rol: m.rol,
                nombre: u?.nombre ?? nombrePorMail.get(mail) ?? mail.split('@')[0],
                mail,
                fechaUnion: m.fechaUnion ?? u?.fecha_union ?? null,
                fechaBaja: m.fechaBaja ?? u?.fecha_baja ?? null,
                pendiente: m.pendiente,
                activo: m.activo,
            };
        });
    }

    // Sin servidor (proyecto sin publicar o sin conexión): solo lo que hay en esta base.
    // LEFT JOIN: los miembros sin usuario local (solo conocidos por mail) también se listan.
    private async desdeLocal(idProyecto: number, soloActivos: boolean): Promise<ProyectoMiembro[]> {
        const filas = await this.persistencia.ejecutar(
            `SELECT pm.*, pm.id_global_usuario::text AS id_global_usuario,
                    COALESCE(NULLIF(u.apodo, ''), u.nombre, split_part(pm.mail, '@', 1)) AS nombre_usuario,
                    COALESCE(u.email, pm.mail) AS email
             FROM proyecto_miembros pm
             LEFT JOIN usuarios u ON u.id_usuario = pm.id_usuario
             WHERE pm.id_proyecto = $1 ${soloActivos ? 'AND pm.fecha_baja IS NULL' : ''}
             ORDER BY (pm.rol = 'propietario') DESC, pm.fecha_union, pm.id_proyecto_miembro`,
            [idProyecto],
        );
        return filas.map(materializarMiembro);
    }
}