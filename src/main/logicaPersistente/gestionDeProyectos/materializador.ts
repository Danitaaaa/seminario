import { Proyecto, ProyectoMiembro, CambioPendiente } from './entidades';

// Convierte el registro de un proyecto de la BD a un objeto Proyecto
export function materializarProyecto(fila: any): Proyecto {
    return {
        idProyecto: fila.id_proyecto,
        nombre: fila.nombre,
        fechaCreacion: fila.fecha_creacion,
        fechaFin: fila.fecha_fin ?? null,
        enlace: fila.enlace ?? null,
        idNodoRaiz: fila.id_nodo_raiz,
        idRemoto: fila.id_remoto ?? null,
        version: fila.version,
        versionServidor: fila.version_servidor,
        ultimaSincronizacion: fila.ultima_sincronizacion ?? null,
    };
}

// Convierte el registro de un miembro (proyecto_miembros + JOIN con usuarios) a ProyectoMiembro.
// Espera las columnas: id_proyecto_miembro, rol, fecha_baja, nombre_usuario, email
export function materializarMiembro(fila: any): ProyectoMiembro {
    return {
        idProyectoMiembro: fila.id_proyecto_miembro ?? null,
        idUsuario: fila.id_usuario ?? null,
        nombre: fila.nombre_usuario,
        mail: String(fila.email).toLowerCase(),
        rol: fila.rol,
        activo: fila.fecha_baja == null,
        pendiente: false,
        fechaUnion: fila.fecha_union ?? null,
        fechaBaja: fila.fecha_baja ?? null,
    };
}

// Convierte un registro de la cola de sincronización a CambioPendiente
export function materializarCambio(fila: any): CambioPendiente {
    return {
        id: Number(fila.id_cambio), // BIGSERIAL llega como string
        idProyecto: fila.id_proyecto,
        entidad: fila.entidad,
        idEntidad: fila.id_entidad,
        operacion: fila.operacion,
        payload: fila.payload,
        fechaCambio: fila.fecha_cambio,
        fechaEnvio: fila.fecha_envio ?? null,
    };
}