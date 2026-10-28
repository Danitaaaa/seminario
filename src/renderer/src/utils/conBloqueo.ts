import type { ClaveEdicion, MotivoLectura, Resultado } from '../hooks/useEdicionCompartida';

interface ApiRapida {
    iniciarEdicion(c: ClaveEdicion): Promise<Resultado<any>>;
    guardarEdicion(c: ClaveEdicion): Promise<Resultado<{ resultado: 'local' | 'subido' | 'pendiente' }>>;
    finalizarEdicion(c: ClaveEdicion): Promise<Resultado<void>>;
}

export type ResultadoRapido = { ok: true } | { ok: false; motivo: string };

const TEXTO_LECTURA: Record<MotivoLectura, string> = {
    bloqueado: 'Otra persona la está editando en este momento. Probá de nuevo en unos minutos.',
    sin_conexion: 'Sin conexión: por ahora solo podés ver este elemento.',
    lector: 'Tu rol en el proyecto es de lector: no podés modificarlo.',
    eliminado: 'Otro miembro eliminó este elemento.',
    conflicto: 'Este elemento tiene un conflicto sin resolver.',
};

/**
 * Para cambios que no abren un formulario (tildar una tarea, arrastrarla a otra columna):
 * toma el bloqueo, hace el cambio local, sube la versión y suelta el bloqueo.
 * Si el proyecto no está compartido, solo ejecuta el cambio local.
 */
export async function conBloqueo(clave: ClaveEdicion, accionLocal: () => Promise<boolean>): Promise<ResultadoRapido> {
    const api = window.api as unknown as ApiRapida;

    const inicio = await api.iniciarEdicion(clave);
    if (!inicio.ok) return { ok: false, motivo: inicio.mensaje };

    const d = inicio.datos;
    if (d.modo === 'solo_lectura') return { ok: false, motivo: TEXTO_LECTURA[d.motivo as MotivoLectura] ?? 'No se puede editar ahora.' };

    try {
        const hecho = await accionLocal();
        if (!hecho) return { ok: false, motivo: 'No se pudo guardar el cambio.' };
        if (d.modo === 'edicion') {
            const subida = await api.guardarEdicion(clave);
            if (!subida.ok) {
                const hayConflicto = subida.codigo === 'VERSION_DESACTUALIZADA' || subida.codigo === 'CONFLICTO_PENDIENTE';
                return { ok: false, motivo: hayConflicto ? 'Hay un conflicto con otra versión: resolvelo desde el aviso de la pantalla.' : subida.mensaje };
            }
        }
        return { ok: true };
    } finally {
        if (d.modo === 'edicion') await api.finalizarEdicion(clave);
    }
}