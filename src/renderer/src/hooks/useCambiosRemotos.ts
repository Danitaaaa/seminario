import { useEffect, useRef } from 'react';

export interface EventoSincronizacion {
  tipo: string;
  idProyecto: number;
  entidad?: string;
  [clave: string]: unknown;
}

interface ApiSync {
  alEventoSincronizacion(cb: (e: EventoSincronizacion) => void): () => void;
}

interface Opciones {
  /** Tipos de evento que disparan el callback. Por defecto: solo 'cambios_recibidos'. */
  tipos?: string[];
  /** Si se indica y el evento trae `entidad`, solo dispara cuando coincide (ej. 'tarea'). */
  entidad?: string;
}

const TIPOS_POR_DEFECTO = ['cambios_recibidos'];

/**
 * Ejecuta `alRecibir` cuando llega un evento de sincronización.
 *
 * `idProyecto`:
 * - número: solo eventos de ese proyecto.
 * - 'todos': eventos de cualquier proyecto (ej. calendario general).
 * - null / undefined: no se suscribe (ej. material de estudio personal, sin proyecto).
 *
 * - No hace falta que `alRecibir` sea estable: se guarda en una ref, así que la
 *   suscripción no se rehace en cada render.
 * - Cada llamada registra su propio oyente y lo quita al desmontarse.
 */
export function useCambiosRemotos(
  idProyecto: number | 'todos' | null | undefined,
  alRecibir: () => void,
  opciones: Opciones = {},
) {
  const callbackRef = useRef(alRecibir);
  useEffect(() => {
    callbackRef.current = alRecibir;
  });

  // Se serializa para que un array nuevo en cada render no rehaga la suscripción.
  const tiposClave = (opciones.tipos ?? TIPOS_POR_DEFECTO).join(',');
  const { entidad } = opciones;

  useEffect(() => {
    if (idProyecto === null || idProyecto === undefined) return;

    const tipos = tiposClave.split(',');
    const api = window.api as unknown as ApiSync;

    return api.alEventoSincronizacion((ev) => {
      if (idProyecto !== 'todos' && ev.idProyecto !== idProyecto) return;
      if (!tipos.includes(ev.tipo)) return;
      if (entidad && ev.entidad && ev.entidad !== entidad) return;
      callbackRef.current();
    });
  }, [idProyecto, tiposClave, entidad]);
}