import { CambioPendiente } from './entidades';

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

// Interfaz de conexión con el servidor externo de sincronización.
export interface ISincronizador {
    estaConectado(): boolean;
    conectar(): Promise<void>;
    desconectar(): Promise<void>;

    // Registra el proyecto en el servidor y devuelve su id remoto y su enlace de invitación. 
    publicarProyecto(idProyectoLocal: number, nombre: string): Promise<EstadoRemoto>;

    // Resuelve un enlace de invitación a un proyecto remoto. 
    resolverEnlace(enlace: string): Promise<{ idRemoto: string; nombre: string; numeroProyecto: string }>;

    // Envía los cambios locales pendientes. Devuelve la nueva versión del servidor. 
    enviarCambios(idRemoto: string, cambios: CambioPendiente[]): Promise<number>;

    // Trae los cambios hechos por otros miembros después de `desdeVersion`. 
    recibirCambios(idRemoto: string, desdeVersion: number): Promise<CambiosRemotos>;

    // Sube/baja el contenido binario de un archivo. 
    subirArchivo(idRemoto: string, idArchivo: number, contenido: Uint8Array): Promise<void>;
    descargarArchivo(idRemoto: string, idArchivo: number): Promise<Uint8Array>;

    // Notifica altas y bajas de miembros. 
    notificarMiembro(idRemoto: string, idUsuario: number, accion: 'alta' | 'baja'): Promise<void>;
}