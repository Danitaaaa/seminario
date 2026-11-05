import { IPersistenciaProyectos, ISincronizador, MiembroRemoto } from './interfacesSincronizacion';

// Helpers compartidos por las clases de miembros: el servidor es la fuente de verdad.

// Tipo de la transacción que recibe `persistencia.transaccion(...)`.
type Tx = Parameters<Parameters<IPersistenciaProyectos['transaccion']>[0]>[0];

export async function idRemotoDe(persistencia: IPersistenciaProyectos, idProyecto: number): Promise<string> {
    const f = await persistencia.ejecutar<{ id_remoto: string | null }>(
        `SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
    if (!f[0]) throw new Error('Proyecto inexistente');
    if (!f[0].id_remoto) {
        throw new Error('El proyecto todavía no se publicó en el servidor. Esperá unos segundos y volvé a intentar.');
    }
    return f[0].id_remoto;
}

export async function asegurarConexion(sincronizador: ISincronizador): Promise<void> {
    if (!sincronizador.estaConectado()) await sincronizador.conectar();
}

export async function buscarMiembroRemoto(
    sincronizador: ISincronizador, idRemoto: string, mail: string,
): Promise<MiembroRemoto | undefined> {
    const lista = await sincronizador.listarMiembrosRemotos(idRemoto);
    return lista.find(m => m.mail.toLowerCase() === mail.toLowerCase());
}

// Acepta el mail o, por compatibilidad, el id de usuario local, y devuelve siempre el mail.
export async function mailDelMiembro(
    persistencia: IPersistenciaProyectos,
    m: { mailMiembro?: string; idUsuarioMiembro?: number },
): Promise<string> {
    if (m.mailMiembro) return m.mailMiembro.toLowerCase();
    const f = await persistencia.ejecutar<{ email: string }>(
        `SELECT LOWER(email) AS email FROM usuarios WHERE id_usuario = $1`, [m.idUsuarioMiembro]);
    if (!f[0]) throw new Error('Usuario inexistente');
    return f[0].email;
}

// Refleja en proyecto_miembros la lista del servidor (alta, cambio de rol, baja), para que
// la validación local (resolverAsignado, permisos) vea a todos los integrantes.
// No encola nada en cola_sincronizacion: es información que ya viene del servidor.
// Requiere la migración que permite id_usuario NULL y agrega la columna mail.
// Devuelve true si cambió algo (alta, baja o rol), para avisarle a la interfaz.
export async function aplicarMiembrosRemotos(tx: Tx, idProyecto: number, remotos: MiembroRemoto[]): Promise<boolean> {
    const foto = async () => JSON.stringify(await tx.ejecutar(
        `SELECT id_proyecto_miembro, rol, fecha_baja FROM proyecto_miembros
         WHERE id_proyecto = $1 ORDER BY id_proyecto_miembro`, [idProyecto]));
    const antes = await foto();
    for (const m of remotos) {
        if (m.pendiente) continue; // todavía no se unió
        const mail = m.mail.trim().toLowerCase();
        const activo = m.activo !== false;

        const ex = (await tx.ejecutar(
            `SELECT id_proyecto_miembro, fecha_baja FROM proyecto_miembros
             WHERE id_proyecto = $1 AND id_global_usuario = id_global_de_mail($2::text)
             ORDER BY (fecha_baja IS NULL) DESC, id_proyecto_miembro DESC LIMIT 1`,
            [idProyecto, mail],
        )) as { id_proyecto_miembro: number; fecha_baja: Date | null }[];

        if (ex.length > 0) {
            const fila = ex[0];
            if (activo) {
                // Reingreso o cambio de rol. Si estaba de baja y volvió, se reactiva la fila.
                await tx.ejecutar(
                    `UPDATE proyecto_miembros
                     SET rol = $2, mail = COALESCE(mail, $3::text), fecha_baja = NULL
                     WHERE id_proyecto_miembro = $1`,
                    [fila.id_proyecto_miembro, m.rol, mail],
                );
            } else if (fila.fecha_baja === null) {
                await tx.ejecutar(
                    `UPDATE proyecto_miembros SET fecha_baja = COALESCE($2::timestamp, NOW())
                     WHERE id_proyecto_miembro = $1`,
                    [fila.id_proyecto_miembro, m.fechaBaja ?? null],
                );
            }
        } else if (activo) {
            await tx.ejecutar(
                `INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol, mail, fecha_union)
                 VALUES ($1,
                         (SELECT id_usuario FROM usuarios WHERE LOWER(email) = $2::text),
                         $3, $2::text, COALESCE($4::timestamp, NOW()))`,
                [idProyecto, mail, m.rol, m.fechaUnion ?? null],
            );
        }
    }
    return (await foto()) !== antes;
}