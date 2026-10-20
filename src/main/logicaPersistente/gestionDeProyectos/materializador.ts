import { Proyecto, ProyectoMiembro, CambioPendiente } from './entidades';

// Convierte el registro de un proyecto de la BD a un objeto Proyecto
export function materializarProyecto(fila: any): Proyecto {
    return {
        id: fila.id_proyecto,
        nombre: fila.nombre,
        numeroProyecto: fila.numero_proyecto,
        materiaAsociada: fila.materia_asociada ?? null,
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

// Convierte un objeto Proyecto a un registro de la BD
export function desmaterializarProyecto(p: Proyecto): Record<string, unknown> {
    return {
        id_proyecto: p.id,
        nombre: p.nombre,
        numero_proyecto: p.numeroProyecto,
        materia_asociada: p.materiaAsociada,
        fecha_creacion: p.fechaCreacion,
        fecha_fin: p.fechaFin,
        enlace: p.enlace,
        id_nodo_raiz: p.idNodoRaiz,
        id_remoto: p.idRemoto,
        version: p.version,
        version_servidor: p.versionServidor,
        ultima_sincronizacion: p.ultimaSincronizacion,
    };
}

// Convierte el registro de un miembro de la BD a un objeto ProyectoMiembro
export function materializarMiembro(fila: any): ProyectoMiembro {
    return {
        id: fila.id_proyecto_miembro,
        idProyecto: fila.id_proyecto,
        idUsuario: fila.id_usuario,
        rol: fila.rol,
        fechaUnion: fila.fecha_union,
        fechaBaja: fila.fecha_baja ?? null,
    };
}

// Convierte un objeto ProyectoMiembro a un registro de la BD
export function desmaterializarMiembro(m: ProyectoMiembro): Record<string, unknown> {
    return {
        id_proyecto_miembro: m.id,
        id_proyecto: m.idProyecto,
        id_usuario: m.idUsuario,
        rol: m.rol,
        fecha_union: m.fechaUnion,
        fecha_baja: m.fechaBaja,
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