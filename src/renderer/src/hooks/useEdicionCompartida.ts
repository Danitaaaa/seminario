import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------- Tipos ---------- */

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

/* ---------- Edición de UN elemento (toma y suelta el bloqueo) ---------- */

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

/* ---------- Quién está editando CADA elemento de una lista (solo consulta) ---------- */

interface OpcionesBloqueos {
    idProyecto: number | null;   // null = contenido personal: no hay bloqueos
    idUsuario: number;
    entidad: EntidadEditable;
    idsGlobales: string[];
    idPropia?: string | null;    // el que yo tengo abierto: ahí el bloqueo es mío
    intervaloMs?: number;        // sondeo de respaldo
}

const SIN_BLOQUEOS: ReadonlyMap<string, string> = new Map();

/** Devuelve idGlobal -> nombre de quien lo está editando. */
export function useBloqueos({
    idProyecto, idUsuario, entidad, idsGlobales, idPropia = null, intervaloMs = 15_000,
}: OpcionesBloqueos): ReadonlyMap<string, string> {
    const [bloqueos, setBloqueos] = useState<ReadonlyMap<string, string>>(SIN_BLOQUEOS);
    const pedido = useRef(0);
    const ids = idsGlobales.join('|');

    const refrescar = useCallback(async () => {
        if (idProyecto == null) return setBloqueos(SIN_BLOQUEOS);
        const actual = ++pedido.current;
        const nuevos = new Map<string, string>();

        await Promise.all(
            ids.split('|').filter(Boolean).map(async (idGlobal) => {
                if (idGlobal === idPropia) return;
                try {
                    const r = (await window.api.consultarEdicion({
                        idProyecto, idUsuario, entidad, idGlobal,
                    })) as Resultado<InfoRemota>;
                    if (r.ok && r.datos.titular) nuevos.set(idGlobal, r.datos.titular.nombre);
                } catch {
                    // una consulta fallida no tira abajo a las demás
                }
            }),
        );

        if (actual === pedido.current) setBloqueos(nuevos); // descarta respuestas viejas
    }, [ids, idProyecto, idUsuario, entidad, idPropia]);

    useEffect(() => {
        void refrescar();
        const t = setInterval(() => void refrescar(), intervaloMs);
        const off = window.api.alEventoSincronizacion((ev: any) => {
            if (ev?.idProyecto !== idProyecto) return;
            const relevante = ev.tipo === 'bloqueo_cambio'
                ? ev.clave?.entidad === entidad
                : ev.tipo === 'cambios_recibidos';
            if (relevante) void refrescar();
        });
        return () => { clearInterval(t); off(); pedido.current++; };
    }, [refrescar, idProyecto, entidad, intervaloMs]);

    return bloqueos;
}