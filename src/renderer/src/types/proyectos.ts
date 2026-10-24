export type RolMiembro = 'propietario' | 'editor' | 'lector';

export interface Proyecto {
    idProyecto: number;
    nombre: string;
    //materiaAsociada: string | null;
    fechaCreacion: string;
    fechaFin: string | null;
    rol?: RolMiembro; // rol del usuario que consulta, si el backend lo devuelve
    id_nodo_raiz: number;
}

export interface Miembro {
    idUsuario: number;
    nombre?: string;
    mail?: string;
    rol: RolMiembro;
    activo: boolean;
}

export const claveProyecto = (p: Proyecto) => `proyecto-${p.idProyecto}`;

export interface CrearProyectoDatos {
    idUsuario: number;
    nombre: string;
    //materiaAsociada?: string;
}

export interface ModificarProyectoDatos {
    idProyecto: number;
    idUsuario: number;
    nombre?: string;
    //materiaAsociada?: string | null;
    fechaFin?: string | Date | null;
}

export interface EliminarProyectoDatos {
    idProyecto: number;
    idUsuario: number;
}

export interface ObtenerProyectoDatos {
    idProyecto: number;
    idUsuario: number;
}

export interface ListarProyectosCriterios {
    idUsuario: number;
    busqueda?: string;
    umbral?: number; // entre 0 y 1
    incluirFinalizados?: boolean;
    ordenarPor?: 'nombre' | 'fecha_creacion' | 'fecha_fin';
    direccion?: 'ASC' | 'DESC';
}

export interface AgregarMiembroDatos {
    idProyecto: number;
    idUsuarioSolicitante: number;
    idUsuarioNuevo: number;
    rol?: 'editor' | 'lector';
}

export interface QuitarMiembroDatos {
    idProyecto: number;
    idUsuarioSolicitante: number;
    idUsuarioMiembro: number; // igual al solicitante = abandonar proyecto
}

export interface ListarMiembrosCriterios {
    idProyecto: number;
    idUsuarioSolicitante: number;
    soloActivos?: boolean;
}

export interface SincronizarProyectoDatos {
    idProyecto: number;
    idUsuario: number;
}

export interface UnirseAProyectoDatos {
    idUsuario: number;
    enlace: string;
}