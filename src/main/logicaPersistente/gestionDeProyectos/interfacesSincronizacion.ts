import type { CambioPendiente, RolMiembro } from './entidades';

export interface IPersistenciaProyectos {
    ejecutar<T extends Record<string, any> = any>(sql: string, valores?: unknown[]): Promise<T[]>;
    transaccion<T>(trabajo: (tx: IPersistenciaProyectos) => Promise<T>): Promise<T>;
}

// Estado de un proyecto en el servidor externo.
export interface EstadoRemoto {
    idRemoto: string;
    enlace: string;
    version: number;
}

export interface CambiosRemotos {
    cambios: CambioPendiente[];
    versionServidor: number;
}

export interface MiembroRemoto {
    mail: string;
    rol: RolMiembro;
    activo: boolean;
    pendiente: boolean;
    fechaUnion: Date | null;   // unido_en
    fechaBaja: Date | null;    // baja_en
}

// Interfaz de conexión con el servidor externo de sincronización.
export interface ISincronizador {
    estaConectado(): boolean;
    conectar(): Promise<void>;
    desconectar(): Promise<void>;

    // Registra el proyecto en el servidor y devuelve su id remoto y su enlace de invitación.
    publicarProyecto(idProyectoLocal: number, nombre: string): Promise<EstadoRemoto>;

    // Resuelve un enlace de invitación a un proyecto remoto (incluye el rol del usuario si ya fue invitado).
    resolverEnlace(enlace: string): Promise<{ idRemoto: string; nombre: string; numeroProyecto: string; rol?: RolMiembro }>;

    // Envía los cambios locales pendientes. Devuelve la nueva versión del servidor.
    enviarCambios(idRemoto: string, cambios: CambioPendiente[]): Promise<number>;

    // Trae los cambios hechos por otros miembros después de `desdeVersion`.
    recibirCambios(idRemoto: string, desdeVersion: number): Promise<CambiosRemotos>;

    // Sube/baja el contenido binario de un archivo.
    subirArchivo(idRemoto: string, idArchivo: number, contenido: Uint8Array): Promise<void>;
    descargarArchivo(idRemoto: string, idArchivo: number): Promise<Uint8Array>;

    // Notifica altas y bajas de miembros (el rol solo aplica a las altas).
    notificarMiembro(idRemoto: string, idUsuario: number, accion: 'alta' | 'baja', rol?: RolMiembro): Promise<void>;

    // dentro de ISincronizador (junto a gestionarMiembroPorMail):
    listarMiembrosRemotos(idRemoto: string): Promise<MiembroRemoto[]>;

    // Alta/baja de un miembro por mail (sirve para quien todavía no tiene cuenta ni existe en esta base).
    gestionarMiembroPorMail(idRemoto: string, mail: string, accion: 'alta' | 'baja', rol?: RolMiembro): Promise<void>;
}

/* ---------------- Edición compartida (bloqueos + versiones) ---------------- */

export type EntidadEditable = 'archivo' | 'evento' | 'meta' | 'tarea';

/** Identifica un elemento en TODAS las computadoras (los ids locales no sirven). */
export interface ClaveEntidad {
    entidad: EntidadEditable;
    idGlobal: string; // UUID
}

export interface Titular { mail: string; nombre: string; idCliente: string }

export interface EstadoBloqueo {
    concedido: boolean;
    titular: Titular | null;          // quién lo tiene (si alguien lo tiene y no venció)
    desde: Date | null;
    venceEn: Date | null;
    version: number;                  // última versión guardada en el servidor
    ultimaModificacion: Date | null;
    ultimoAutor: string | null;
    eliminado: boolean;
}

export interface VersionRemota {
    version: number;
    datos: unknown;
    ruta: string | null;              // objeto en Storage cuando hay contenido binario
    autor: string;
    fecha: Date;
    eliminado: boolean;
}

export interface IBloqueador {
    /** Atómico en el servidor. Si lo tiene otro: concedido=false y titular informado. */
    adquirirBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<EstadoBloqueo>;
    /** false si ya no es mío (venció o lo tomó otro). */
    renovarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<boolean>;
    liberarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<void>;
    /** Consulta sin tomar el bloqueo. */
    consultarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<EstadoBloqueo>;
    /** Lanza ErrorBloqueoPerdido o ErrorVersionDesactualizada. Nunca se reintenta solo. */
    guardarVersion(idRemoto: string, clave: ClaveEntidad, versionBase: number, datos: unknown, contenido?: Uint8Array): Promise<VersionRemota>;
    obtenerVersion(idRemoto: string, clave: ClaveEntidad): Promise<VersionRemota | null>;
    descargarContenido(ruta: string): Promise<Uint8Array>;
}

export type AvisoRemoto =
    | { tipo: 'cambios'; version: number }
    | { tipo: 'bloqueo'; clave: ClaveEntidad; titular: Titular | null }
    | { tipo: 'estado'; conectado: boolean };

export interface IAvisos {
    /** Avisos en vivo de un proyecto. Devuelve la función para cancelar la suscripción. */
    suscribir(idRemoto: string, escucha: (aviso: AvisoRemoto) => void): Promise<() => void>;
}

/** Eventos que el main le reenvía a la interfaz. */
export type EventoSincronizacion =
    | { tipo: 'bloqueo_perdido'; idProyecto: number; clave: ClaveEntidad }
    | { tipo: 'bloqueo_cambio'; idProyecto: number; clave: ClaveEntidad; titular: { nombre: string; mail: string } | null }
    | { tipo: 'cambios_recibidos'; idProyecto: number; cantidad: number }
    | { tipo: 'conflicto_detectado'; idProyecto: number; clave: ClaveEntidad }
    | { tipo: 'conexion_perdida' }
    | { tipo: 'conexion_recuperada' }
    | { tipo: 'error_sync'; idProyecto: number; mensaje: string };