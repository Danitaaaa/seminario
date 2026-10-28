export type CodigoError =
    | 'SIN_CONEXION' | 'SERVIDOR_NO_DISPONIBLE' | 'SESION_EXPIRADA' | 'SIN_PERMISO'
    | 'BLOQUEO_OCUPADO' | 'BLOQUEO_PERDIDO' | 'VERSION_DESACTUALIZADA' | 'ARCHIVO_GRANDE'
    | 'NO_ENCONTRADO' | 'INVITACION_INVALIDA' | 'NO_INVITADO' | 'ENTIDAD_ELIMINADA'
    | 'CONFLICTO_PENDIENTE' | 'DESCONOCIDO';

export class ErrorSincronizacion extends Error {
    constructor(readonly codigo: CodigoError, mensaje: string, readonly detalle?: Record<string, unknown>) {
        super(mensaje);
        this.name = new.target.name;
    }
}

export class ErrorSinConexion extends ErrorSincronizacion {
    constructor() {
        super('SIN_CONEXION',
            'No hay conexión con el servidor de sincronización. Revisá tu internet; si persiste, el proyecto de Supabase puede estar pausado (se reactiva desde su panel).');
    }
}
export class ErrorServidorNoDisponible extends ErrorSincronizacion {
    constructor() { super('SERVIDOR_NO_DISPONIBLE', 'El servidor de sincronización no está disponible en este momento.'); }
}
export class ErrorSesionExpirada extends ErrorSincronizacion {
    constructor(mensaje = 'La sesión de sincronización expiró. Volvé a iniciar sesión.') { super('SESION_EXPIRADA', mensaje); }
}
export class ErrorPermiso extends ErrorSincronizacion {
    constructor(mensaje = 'No tenés permisos para esta operación.') { super('SIN_PERMISO', mensaje); }
}
export class ErrorBloqueoOcupado extends ErrorSincronizacion {
    constructor(nombre: string, desde: Date | null) {
        super('BLOQUEO_OCUPADO', `${nombre} está editando este elemento.`, { nombre, desde });
    }
}
export class ErrorBloqueoPerdido extends ErrorSincronizacion {
    constructor() {
        super('BLOQUEO_PERDIDO', 'Perdiste el bloqueo de edición (venció o lo tomó otra persona). Tus cambios quedaron guardados en tu equipo.');
    }
}
export class ErrorVersionDesactualizada extends ErrorSincronizacion {
    constructor(readonly versionServidor: number) {
        super('VERSION_DESACTUALIZADA', 'Otra persona guardó una versión más nueva. Hay que resolver el conflicto.', { versionServidor });
    }
}
export class ErrorArchivoGrande extends ErrorSincronizacion {
    constructor(maxBytes?: number) {
        super('ARCHIVO_GRANDE', maxBytes
            ? `El archivo supera el máximo de ${Math.round(maxBytes / 1048576)} MB permitido por el servidor.`
            : 'El archivo supera el tamaño máximo permitido por el servidor.');
    }
}

/** Convierte errores de supabase-js / PostgREST / red en errores de dominio. */
export function traducirErrorSupabase(e: unknown): ErrorSincronizacion {
    if (e instanceof ErrorSincronizacion) return e;
    const err = (e ?? {}) as { message?: string; code?: string; status?: number; statusCode?: string | number; name?: string };
    const m = String(err.message ?? e ?? '');
    const status = Number(err.status ?? err.statusCode ?? 0);

    if (m.startsWith('BLOQUEO_PERDIDO')) return new ErrorBloqueoPerdido();
    const v = /^VERSION_DESACTUALIZADA:(\d+)/.exec(m);
    if (v) return new ErrorVersionDesactualizada(Number(v[1]));
    if (m.startsWith('ENTIDAD_ELIMINADA')) return new ErrorSincronizacion('ENTIDAD_ELIMINADA', 'Otro miembro eliminó este elemento.');
    if (m.startsWith('INVITACION_INVALIDA')) return new ErrorSincronizacion('INVITACION_INVALIDA', 'El enlace de invitación es inválido o expiró.');
    if (m.startsWith('NO_INVITADO')) return new ErrorSincronizacion('NO_INVITADO', 'Todavía no fuiste agregado a este proyecto. Pedile al propietario que te invite con tu mail.');
    if (m.startsWith('SIN_PERMISO') || status === 403 || /row-level security|violates row/i.test(m)) return new ErrorPermiso();
    if (err.name === 'AuthRetryableFetchError') return new ErrorSinConexion();
    if (m.startsWith('NO_AUTENTICADO') || status === 401 || /jwt|not authenticated/i.test(m)) return new ErrorSesionExpirada();
    if (err.code === 'PGRST116') return new ErrorSincronizacion('NO_ENCONTRADO', 'El elemento remoto no existe o ya no tenés acceso.');
    if (status === 413 || /maximum allowed size|payload too large/i.test(m)) return new ErrorArchivoGrande();
    if (/fetch failed|failed to fetch|network|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|timeout/i.test(m)) return new ErrorSinConexion();
    if (status >= 500) return new ErrorServidorNoDisponible();
    return new ErrorSincronizacion('DESCONOCIDO', m || 'Error desconocido de sincronización.');
}

/** Reintenta con espera creciente SOLO ante fallas de red. Usar solo en operaciones idempotentes. */
export async function conReintentos<T>(fn: () => Promise<T>, intentos = 3, baseMs = 400): Promise<T> {
    for (let i = 0; ; i++) {
        try { return await fn(); }
        catch (e) {
            const red = e instanceof ErrorSinConexion || e instanceof ErrorServidorNoDisponible;
            if (!red || i >= intentos - 1) throw e;
            await new Promise(r => setTimeout(r, baseMs * 2 ** i + Math.random() * 100));
        }
    }
}

/** Sobre uniforme para IPC: los errores personalizados pierden sus campos al cruzar Electron. */
export type Resultado<T> =
    | { ok: true; datos: T }
    | { ok: false; codigo: CodigoError; mensaje: string; detalle?: Record<string, unknown> };

export async function aResultado<T>(f: () => Promise<T>): Promise<Resultado<T>> {
    try { return { ok: true, datos: await f() }; }
    catch (e) {
        if (e instanceof ErrorSincronizacion) return { ok: false, codigo: e.codigo, mensaje: e.message, detalle: e.detalle };
        const mensaje = e instanceof Error ? e.message : String(e);
        return { ok: false, codigo: 'DESCONOCIDO', mensaje };
    }
}