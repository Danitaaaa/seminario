import { useCallback, useEffect, useRef, useState } from 'react';

export type EntidadEditable = 'archivo' | 'evento' | 'meta' | 'tarea';
export interface ClaveEdicion { idProyecto: number; idUsuario: number; entidad: EntidadEditable; idGlobal: string }
export interface InfoRemota {
    titular: { nombre: string; mail: string } | null;
    desde: Date | null;
    version: number;
    ultimaModificacion: Date | null;
    ultimoAutor: string | null;
}
export type MotivoLectura = 'bloqueado' | 'sin_conexion' | 'lector' | 'eliminado' | 'conflicto';
export type EstadoEdicion =
    | { fase: 'cargando' }
    | { fase: 'local' }
    | ({ fase: 'solo_lectura'; motivo: MotivoLectura } & InfoRemota)
    | { fase: 'edicion'; sinConexion: boolean; pendienteSubida: boolean }
    | { fase: 'perdido' }
    | { fase: 'conflicto' }
    | { fase: 'error'; mensaje: string };

export type Resultado<T> = { ok: true; datos: T } | { ok: false; codigo: string; mensaje: string; detalle?: Record<string, unknown> };

interface ApiEdicion {
    iniciarEdicion(c: ClaveEdicion): Promise<Resultado<any>>;
    guardarEdicion(c: ClaveEdicion): Promise<Resultado<{ resultado: 'local' | 'subido' | 'pendiente' }>>;
    finalizarEdicion(c: ClaveEdicion): Promise<Resultado<void>>;
    consultarEdicion(c: ClaveEdicion): Promise<Resultado<InfoRemota>>;
    alEventoSincronizacion(cb: (e: any) => void): () => void;
}

/**
 * Pide el bloqueo al abrir un elemento compartido y lo suelta al cerrarlo.
 * Uso: const { estado, puedeEditar, guardar } = useEdicionCompartida(clave);
 *  - Con clave = null (p. ej. al crear un elemento nuevo) el hook queda en 'local' y no hace nada.
 *  - Guardá primero con tu llamada de siempre (local) y después llamá a guardar() para subirlo.
 *  - Si puedeEditar es false, deshabilitá los campos y mostrá <BannerEdicion estado={estado} />.
 */
export function useEdicionCompartida(clave: ClaveEdicion | null) {
    const api = window.api as unknown as ApiEdicion;
    const claveRef = useRef(clave);
    claveRef.current = clave;
    const k = clave ? `${clave.idProyecto}:${clave.entidad}:${clave.idGlobal}` : '';
    const [estado, setEstado] = useState<EstadoEdicion>(clave ? { fase: 'cargando' } : { fase: 'local' });

    const iniciar = useCallback(async () => {
        const c = claveRef.current;
        if (!c) return;
        setEstado({ fase: 'cargando' });
        const r = await api.iniciarEdicion(c);
        if (!r.ok) { setEstado({ fase: 'error', mensaje: r.mensaje }); return; }
        const d = r.datos;
        if (d.modo === 'local') setEstado({ fase: 'local' });
        else if (d.modo === 'edicion') setEstado({ fase: 'edicion', sinConexion: d.sinConexion, pendienteSubida: false });
        else setEstado({
            fase: 'solo_lectura', motivo: d.motivo, titular: d.titular, desde: d.desde, version: d.version,
            ultimaModificacion: d.ultimaModificacion, ultimoAutor: d.ultimoAutor,
        });
    }, [api]);

    // Actualiza quién edita y la última versión sin tomar el bloqueo.
    const refrescarInfo = useCallback(async () => {
        const c = claveRef.current;
        if (!c) return;
        const r = await api.consultarEdicion(c);
        if (r.ok) setEstado(e => (e.fase === 'solo_lectura' ? { ...e, ...r.datos } : e));
    }, [api]);

    useEffect(() => {
        if (!clave) { setEstado({ fase: 'local' }); return; }
        void iniciar();
        const baja = api.alEventoSincronizacion(ev => {
            const c = claveRef.current;
            if (!c) return;
            const mismo = ev.clave && ev.idProyecto === c.idProyecto && ev.clave.entidad === c.entidad && ev.clave.idGlobal === c.idGlobal;
            if (ev.tipo === 'bloqueo_perdido' && mismo) setEstado({ fase: 'perdido' });
            else if (ev.tipo === 'conflicto_detectado' && mismo) setEstado({ fase: 'conflicto' });
            else if (ev.tipo === 'bloqueo_cambio' && mismo) void refrescarInfo();
            else if (ev.tipo === 'cambios_recibidos' && ev.idProyecto === c.idProyecto) void refrescarInfo();
            else if (ev.tipo === 'conexion_perdida') setEstado(e => (e.fase === 'edicion' ? { ...e, sinConexion: true } : e));
            else if (ev.tipo === 'conexion_recuperada') setEstado(e => (e.fase === 'edicion' ? { ...e, sinConexion: false } : e));
        });
        return () => { baja(); void api.finalizarEdicion(clave); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [k]);

    const guardar = useCallback(async () => {
        const c = claveRef.current;
        if (!c) return null;
        const r = await api.guardarEdicion(c);
        if (!r.ok) {
            if (r.codigo === 'VERSION_DESACTUALIZADA' || r.codigo === 'CONFLICTO_PENDIENTE') setEstado({ fase: 'conflicto' });
            else if (r.codigo === 'BLOQUEO_PERDIDO') setEstado({ fase: 'perdido' });
            else setEstado({ fase: 'error', mensaje: r.mensaje });
        } else if (r.datos.resultado === 'pendiente') {
            setEstado(e => (e.fase === 'edicion' ? { ...e, pendienteSubida: true } : e));
        } else {
            setEstado(e => (e.fase === 'edicion' ? { ...e, pendienteSubida: false } : e));
        }
        return r;
    }, [api]);

    return { estado, puedeEditar: estado.fase === 'edicion' || estado.fase === 'local', guardar, reintentar: iniciar };
}