export type RolMiembro = 'propietario' | 'editor' | 'lector';

export interface Proyecto {
    idProyecto: number;
    nombre: string;
    fechaCreacion: Date;
    fechaFin: Date | null;
    enlace: string | null;
    idNodoRaiz: number;      // carpeta raíz propia del proyecto (módulo gestionMaterialEstudio)
    idRemoto: string | null; // id en el servidor de sincronización
    version: number;
    versionServidor: number; // última versión del servidor aplicada localmente
    ultimaSincronizacion: Date | null;
}

export interface ProyectoMiembro {
    mail: string;
    nombre: string;
    idUsuario: number | null;           // null si el usuario no existe en esta base
    idProyectoMiembro: number | null;
    rol: RolMiembro;
    activo: boolean;
    pendiente: boolean;
    fechaUnion: Date | null;            // alta; null si solo existe en el servidor
    fechaBaja: Date | null;             // baja; null mientras esté activo
}

export type EntidadSincronizable = 'proyecto' | 'miembro' | 'nodo' | 'archivo' | 'evento' | 'meta' | 'tarea';
export type OperacionSincronizable = 'crear' | 'modificar' | 'eliminar' | 'mover';

export interface CambioPendiente {
    id: number;
    idProyecto: number;
    entidad: EntidadSincronizable;
    idEntidad: number;
    operacion: OperacionSincronizable;
    payload: unknown;
    fechaCambio: Date;
    fechaEnvio: Date | null;
}

/** Duración en milisegundos (fechaFin - fechaCreacion) o null si no tiene fecha de fin. */
export function calcularDuracion(p: Proyecto): number | null {
    return p.fechaFin ? p.fechaFin.getTime() - p.fechaCreacion.getTime() : null;
}