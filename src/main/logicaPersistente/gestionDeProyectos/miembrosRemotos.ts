import { IPersistenciaProyectos, ISincronizador, MiembroRemoto } from './interfacesSincronizacion';

// Helpers compartidos por las clases de miembros: el servidor es la fuente de verdad.

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