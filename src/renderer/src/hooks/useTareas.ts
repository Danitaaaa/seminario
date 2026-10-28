import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatosTarea, Tarea } from '../types/tareas';

type CamposEditables = Partial<Pick<DatosTarea, 'titulo' | 'descripcion' | 'prioridad' | 'fechaLimite' | 'fechaInicio'>>;

export function useTareas(idProyecto: number, idUsuario: number) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copia síncrona para poder volver atrás cuando falla un cambio optimista.
  const tareasRef = useRef<Tarea[]>([]);

  // Para descartar respuestas viejas si se pide otra carga (o cambia el proyecto) antes de que llegue.
  const cargaActual = useRef(0);

  const aplicar = useCallback((siguiente: Tarea[]) => {
    const lista = Array.isArray(siguiente) ? siguiente : [];
    // Una sola copia por idTarea (gana la última).
    const unicas = new Map<number, Tarea>();
    for (const t of lista) unicas.set(t.idTarea, t);
    const listaSegura = [...unicas.values()];
    tareasRef.current = listaSegura;
    setTareas(listaSegura);
  }, []);

  const reemplazar = useCallback(
    (nueva: Tarea) => aplicar(tareasRef.current.map((t) => (t.idTarea === nueva.idTarea ? nueva : t))),
    [aplicar],
  );

  // silencioso = true: no muestra "Cargando…" (se usa al recibir cambios de otras PCs).
  const cargar = useCallback(
    async (silencioso: boolean): Promise<void> => {
      const miCarga = ++cargaActual.current;
      if (!silencioso) setCargando(true);
      setError(null);

      try {
        const lista = await window.api.listarTareas({ idProyecto, idUsuario });
        if (miCarga !== cargaActual.current) return;
        aplicar(Array.isArray(lista) ? (lista as Tarea[]) : []);
      } catch (e) {
        console.error('No se pudieron cargar las tareas', e);
        if (miCarga !== cargaActual.current) return;
        setError('No se pudieron cargar las tareas.');
        if (!silencioso) aplicar([]);
      } finally {
        if (miCarga === cargaActual.current && !silencioso) setCargando(false);
      }
    },
    [idProyecto, idUsuario, aplicar],
  );

  useEffect(() => {
    void cargar(false);
    return () => {
      // Invalida cualquier carga en curso al desmontar o cambiar de proyecto.
      cargaActual.current++;
    };
  }, [cargar]);

  const recargar = useCallback(() => cargar(true), [cargar]);

  const ejecutar = useCallback(async <T,>(accion: () => Promise<T>, mensaje: string): Promise<T | null> => {
    try {
      return await accion();
    } catch (e) {
      console.error(mensaje, e);
      setError(mensaje);
      return null;
    }
  }, []);

  const crear = useCallback(
    async (datos: DatosTarea): Promise<boolean> => {
      const nueva = await ejecutar(
        () => window.api.crearTarea({ idProyecto, idUsuario, ...datos }) as Promise<Tarea>,
        'No se pudo crear la tarea.',
      );

      if (!nueva) return false;
      aplicar([...tareasRef.current, nueva]);
      return true;
    },
    [idProyecto, idUsuario, ejecutar, aplicar],
  );

  const modificar = useCallback(
    async (idTarea: number, campos: CamposEditables): Promise<boolean> => {
      const nueva = await ejecutar(
        () => window.api.modificarTarea({ idTarea, idUsuario, ...campos }) as Promise<Tarea>,
        'No se pudo guardar la tarea.',
      );

      if (!nueva) return false;
      reemplazar(nueva);
      return true;
    },
    [idUsuario, ejecutar, reemplazar],
  );

  const alternar = useCallback(
    async (tarea: Tarea): Promise<boolean> => {
      const previas = tareasRef.current;
      const completada = !tarea.completada;

      reemplazar({
        ...tarea,
        completada,
        fechaCompletada: completada ? new Date().toISOString() : null,
        completadaPor: completada ? idUsuario : null,
      });

      const nueva = await ejecutar(
        () => window.api.alternarTarea({ idTarea: tarea.idTarea, idUsuario, completada }) as Promise<Tarea>,
        'No se pudo actualizar la tarea.',
      );

      if (!nueva) {
        aplicar(previas);
        return false;
      }
      reemplazar(nueva);
      return true;
    },
    [idUsuario, ejecutar, reemplazar, aplicar],
  );

  const asignar = useCallback(
    async (tarea: Tarea, idAsignado: number | null): Promise<boolean> => {
      if (idAsignado !== null && !Number.isFinite(idAsignado)) return false;
      if (tarea.idAsignado === idAsignado) return true;
      const previas = tareasRef.current;

      const ordenFinal =
        Math.max(0, ...previas.filter((t) => t.idAsignado === idAsignado).map((t) => t.orden)) + 1;

      reemplazar({ ...tarea, idAsignado, orden: ordenFinal });

      const nueva = await ejecutar(
        () => window.api.asignarTarea({ idTarea: tarea.idTarea, idUsuario, idAsignado }) as Promise<Tarea>,
        'No se pudo asignar la tarea.',
      );

      if (!nueva) {
        aplicar(previas);
        return false;
      }
      reemplazar(nueva);
      return true;
    },
    [idUsuario, ejecutar, reemplazar, aplicar],
  );

  const repartir = useCallback(async (): Promise<boolean> => {
    const cambiadas = await ejecutar(
      () => window.api.repartirTareas({ idProyecto, idUsuario }) as Promise<Tarea[]>,
      'No se pudieron repartir las tareas.',
    );

    if (!Array.isArray(cambiadas)) return false;

    const porId = new Map(cambiadas.map((t) => [t.idTarea, t]));
    aplicar(tareasRef.current.map((t) => porId.get(t.idTarea) ?? t));
    return true;
  }, [idProyecto, idUsuario, ejecutar, aplicar]);

  const eliminar = useCallback(
    async (idTarea: number): Promise<boolean> => {
      const resultado = await ejecutar(async () => {
        await window.api.eliminarTarea({ idTarea, idUsuario });
        return true;
      }, 'No se pudo eliminar la tarea.');

      if (!resultado) return false;
      aplicar(tareasRef.current.filter((t) => t.idTarea !== idTarea));
      return true;
    },
    [idUsuario, ejecutar, aplicar],
  );

  const limpiarError = useCallback(() => setError(null), []);

  return {
    tareas,
    cargando,
    error,
    limpiarError,
    recargar,
    crear,
    modificar,
    alternar,
    asignar,
    repartir,
    eliminar,
  };
}