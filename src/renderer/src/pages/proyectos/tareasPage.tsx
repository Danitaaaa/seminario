import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Miembro, Proyecto } from '../../types/proyectos';
import type { DatosTarea, FiltroTareas, Tarea } from '../../types/tareas';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { ColumnaTareas } from '../../components/proyectos/columnaTareas';
import { FiltrosTareas } from '../../components/proyectos/filtrosTareas';
import { ModalTarea } from '../../components/proyectos/modalTarea';
import { ResumenTareas } from '../../components/proyectos/resumenTareas';
import type { AccionesTarjeta } from '../../components/proyectos/tarjetaTarea';
import { BannerEdicion } from '../../components/proyectos/bannerEdicion';
import { ModalConflicto } from '../../components/proyectos/modalConflicto';
import { useTareas } from '../../hooks/useTareas';
import { useEdicionCompartida, useBloqueos } from '../../hooks/useEdicionCompartida';
import type { ClaveEdicion, Resultado } from '../../hooks/useEdicionCompartida';
import { conBloqueo } from '../../utils/conBloqueo';
import {
  agruparPorColumna,
  armarColumnas,
  columnaDe,
  contarFiltros,
  segmentosAporte,
} from '../../utils/tablero';
import '../../styles/proyectos.css';
import '../../styles/tareas.css';
import '../../styles/edicion.css';
import { obtenerUsuarioId, asegurarUsuarioIdGlobal } from '../../../lib/sesion';
import { puede, rolDe } from '../../permisos';
import type { Accion } from '../../permisos';

const NOMBRE_USUARIO_ACTUAL = ''; //Pendiente hasta implementación de perfil

interface ApiSync {
  listarConflictos(d: { idProyecto: number; idUsuario: number }): Promise<Resultado<{ entidad: string; idGlobal: string }[]>>;
  alEventoSincronizacion(cb: (e: any) => void): () => void;
}

// El id global puede ser null (proyectos personales / usuario sin cuenta sincronizada): es válido.
export function TareasPage() {
  const idUsuario = obtenerUsuarioId();
  const [idGlobal, setIdGlobal] = useState<string | null>(null);
  const [resuelto, setResuelto] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let activo = true;
    void asegurarUsuarioIdGlobal().then((g) => {
      if (!activo) return;
      setIdGlobal(g);
      setResuelto(true);
    });
    return () => {
      activo = false;
    };
  }, []);

  if (idUsuario === null) {
    return (
      <PlantillaLayout titulo="División de tareas" idActivo="proyectos" usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}>
        <CartelError mensaje="No hay una sesión iniciada. Volvé a ingresar." onCerrar={() => navigate('/')} />
      </PlantillaLayout>
    );
  }

  if (!resuelto) {
    return (
      <PlantillaLayout titulo="División de tareas" idActivo="proyectos" usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}>
        <p>Cargando…</p>
      </PlantillaLayout>
    );
  }

  return <TareasContenido ID_USUARIO_ACTUAL={idUsuario} ID_GLOBAL_ACTUAL={idGlobal} />;
}

function TareasContenido({
  ID_USUARIO_ACTUAL,
  ID_GLOBAL_ACTUAL,
}: {
  ID_USUARIO_ACTUAL: number;
  ID_GLOBAL_ACTUAL: string | null;
}) {
  const { id } = useParams();
  const idProyecto = Number(id);
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [filtro, setFiltro] = useState<FiltroTareas>('todas');
  const [idArrastrada, setIdArrastrada] = useState<number | null>(null);
  // undefined = modal cerrado, null = tarea nueva, Tarea = edición
  const [edicion, setEdicion] = useState<Tarea | null | undefined>(undefined);

  // Conflictos de edición compartida (idGlobal de las tareas afectadas)
  const [conflictos, setConflictos] = useState<string[]>([]);
  const [conflictoAbierto, setConflictoAbierto] = useState<string | null>(null);

  const { tareas, cargando, error, limpiarError, recargar, crear, modificar, alternar, asignar, repartir, eliminar } =
    useTareas(idProyecto, ID_USUARIO_ACTUAL);

  /* ---------- Edición compartida ---------- */

  const claveDe = useCallback(
    (idGlobal: string): ClaveEdicion => ({ idProyecto, idUsuario: ID_USUARIO_ACTUAL, entidad: 'tarea', idGlobal }),
    [idProyecto, ID_USUARIO_ACTUAL],
  );

  // Solo se pide el bloqueo al editar una tarea existente; al crear una nueva no hace falta.
  const { estado, puedeEditar: puedeEditarTarea, guardar: subirCambios, reintentar } = useEdicionCompartida(
    edicion ? claveDe(edicion.idGlobal) : null,
  );

  // Tareas que otra persona está editando ahora (idGlobal -> nombre)
  const bloqueos = useBloqueos({
    idProyecto,
    idUsuario: ID_USUARIO_ACTUAL,
    entidad: 'tarea',
    idsGlobales: tareas.map((t) => t.idGlobal),
    idPropia: edicion ? edicion.idGlobal : null,
  });

  const cargarConflictos = useCallback(async () => {
    const api = window.api as unknown as ApiSync;
    const r = await api.listarConflictos({ idProyecto, idUsuario: ID_USUARIO_ACTUAL });
    if (r.ok) setConflictos(r.datos.filter((c) => c.entidad === 'tarea').map((c) => c.idGlobal));
  }, [idProyecto, ID_USUARIO_ACTUAL]);

  useEffect(() => {
    void cargarConflictos();
  }, [cargarConflictos]);

  // Cambios que llegan de otras PCs: se recarga el tablero y la lista de conflictos.
  useEffect(() => {
    const api = window.api as unknown as ApiSync;
    return api.alEventoSincronizacion((ev) => {
      if (ev.idProyecto !== idProyecto) return;
      if (ev.tipo === 'cambios_recibidos') void recargar();
      if (ev.tipo === 'cambios_recibidos' || ev.tipo === 'conflicto_detectado') void cargarConflictos();
    });
  }, [idProyecto, recargar, cargarConflictos]);

  /* ---------- Proyecto y miembros ---------- */

  useEffect(() => {
    let activo = true;
    Promise.all([
      window.api.obtenerProyecto({ idProyecto, idUsuario: ID_USUARIO_ACTUAL }),
      window.api.listarMiembros({ idProyecto, idUsuarioSolicitante: ID_USUARIO_ACTUAL }),
    ])
      .then(([p, m]) => {
        if (!activo) return;
        setProyecto(p);
        setMiembros(m);
      })
      .catch((e) => {
        console.error('No se pudo abrir el proyecto', e);
        if (activo) setErrorPagina('No se pudo abrir el proyecto.');
      });
    return () => {
      activo = false;
    };
  }, [idProyecto, ID_USUARIO_ACTUAL]);

  const columnas = useMemo(() => armarColumnas(miembros, ID_GLOBAL_ACTUAL), [miembros, ID_GLOBAL_ACTUAL]);
  const idsColumnas = useMemo(() => new Set(columnas.map((c) => c.idGlobal)), [columnas]);
  const grupos = useMemo(() => agruparPorColumna(tareas, columnas), [tareas, columnas]);
  const cuentas = useMemo(() => contarFiltros(tareas, grupos), [tareas, grupos]);
  const segmentos = useMemo(
    () => segmentosAporte(columnas, grupos, tareas.length),
    [columnas, grupos, tareas.length],
  );

  // El rol se busca por id local: funciona también sin id global.
  const rol = rolDe(miembros, ID_USUARIO_ACTUAL);

  const tareaArrastrada = tareas.find((t) => t.idTarea === idArrastrada) ?? null;
  const columnaOrigen = tareaArrastrada ? columnaDe(tareaArrastrada, idsColumnas) : null;

  /* ---------- Cambios rápidos (tildar, arrastrar, eliminar): toman el bloqueo un instante ---------- */

  async function conLock(t: Tarea, accion: () => Promise<boolean>) {
    const r = await conBloqueo(claveDe(t.idGlobal), accion);
    if (!r.ok) setAviso(r.motivo);
    void cargarConflictos();
  }

  function permitido(accion: Accion): boolean {
    if (puede(rol, accion)) return true;
    setAviso('Tu rol en este proyecto no permite hacer esto.');
    return false;
  }

  const acciones: AccionesTarjeta = {
    onAlternar: (t) => {
      if (!permitido('tarea.alternar')) return;
      void conLock(t, async () => {
        const r: unknown = await alternar(t);
        return r !== false;
      });
    },
    onEditar: (t) => setEdicion(t),
    onEliminar: (t) => {
      if (!permitido('tarea.eliminar')) return;
      if (!window.confirm(`¿Eliminar la tarea "${t.titulo}"?`)) return;
      void conLock(t, () => eliminar(t.idTarea));
    },
    onAsignar: (t, idAsignadoGlobal) => {
      if (permitido('tarea.asignar')) void conLock(t, () => asignar(t, idAsignadoGlobal));
    },
    onArrastrarInicio: (t) => setIdArrastrada(t.idTarea),
    onArrastrarFin: () => setIdArrastrada(null),
  };

  function soltarEn(idAsignadoGlobal: string | null) {
    const tarea = tareaArrastrada;
    setIdArrastrada(null);
    if (tarea && permitido('tarea.asignar')) void conLock(tarea, () => asignar(tarea, idAsignadoGlobal));
  }

  /* ---------- Guardar desde el modal ---------- */

  async function guardar(datos: DatosTarea): Promise<boolean> {
    if (!edicion) return puede(rol, 'tarea.crear') ? crear(datos) : false;
    if (!puede(rol, 'tarea.editar') || !puedeEditarTarea) return false;

    // 1) Cambios locales
    let ok = await modificar(edicion.idTarea, {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      prioridad: datos.prioridad,
      fechaLimite: datos.fechaLimite,
      fechaInicio: datos.fechaInicio,
    });
    if (ok && datos.idAsignadoGlobal !== columnaDe(edicion, idsColumnas)) {
      ok = await asignar(edicion, datos.idAsignadoGlobal);
    }
    if (!ok) return false;

    // 2) Subida al servidor. Si hay conflicto, el modal queda abierto con el aviso para resolverlo.
    const r = await subirCambios();
    void cargarConflictos();
    return r === null || r.ok;
  }

  function alResolverConflicto() {
    setConflictoAbierto(null);
    setEdicion(undefined);
    void recargar();
    void cargarConflictos();
  }

  if (!proyecto) {
    return (
      <PlantillaLayout titulo="División de tareas" idActivo="proyectos" usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}>
        {errorPagina ? (
          <CartelError mensaje={errorPagina} onCerrar={() => navigate('/proyectos')} />
        ) : (
          <p>Cargando…</p>
        )}
      </PlantillaLayout>
    );
  }

  const hayPorRepartir = (grupos.get(null) ?? []).some((t) => !t.completada);

  return (
    <PlantillaLayout titulo="División de tareas" idActivo="proyectos" usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}>
      <div className="tareas-pagina">
        <nav className="tareas-ruta" aria-label="Ruta">
          <button type="button" onClick={() => navigate('/proyectos')}>
            Proyectos
          </button>
          <span>/</span>
          <button type="button" onClick={() => navigate(`/proyectos/${idProyecto}`)}>
            {proyecto.nombre}
          </button>
          <span>/</span>
          <span aria-current="page">División de tareas</span>
        </nav>

        {error && <CartelError mensaje={error} onCerrar={limpiarError} />}
        {aviso && <CartelError mensaje={aviso} onCerrar={() => setAviso(null)} />}

        {conflictos.length > 0 && (
          <div className="edicion-banner edicion-banner--error" role="status">
            <span>
              {conflictos.length === 1
                ? 'Hay una tarea con un conflicto de edición sin resolver.'
                : `Hay ${conflictos.length} tareas con conflictos de edición sin resolver.`}
            </span>
            <button type="button" className="edicion-banner__accion" onClick={() => setConflictoAbierto(conflictos[0])}>
              Resolver
            </button>
          </div>
        )}

        <ResumenTareas
          total={tareas.length}
          hechas={cuentas.hechas}
          segmentos={segmentos}
          puedeCrear={puede(rol, 'tarea.crear')}
          puedeRepartir={puede(rol, 'tarea.repartir')}
          hayPorRepartir={hayPorRepartir}
          onRepartir={() => { if (permitido('tarea.repartir')) void repartir(); }}
          onNueva={() => { if (permitido('tarea.crear')) setEdicion(null); }}
        />

        <FiltrosTareas filtro={filtro} cuentas={cuentas} onCambiar={setFiltro} />

        {cargando ? (
          <p>Cargando tareas…</p>
        ) : (
          <div className="tareas-tablero">
            <ColumnaTareas
              miembro={null}
              tareas={grupos.get(null) ?? []}
              filtro={filtro}
              asignables={columnas}
              rol={rol}
              bloqueos={bloqueos}
              idArrastrada={idArrastrada}
              puedeSoltar={tareaArrastrada !== null && columnaOrigen !== null}
              acciones={acciones}
              onSoltar={soltarEn}
            />
            {columnas.map((columna) => (
              <ColumnaTareas
                key={columna.idGlobal}
                miembro={columna}
                tareas={grupos.get(columna.idGlobal) ?? []}
                filtro={filtro}
                asignables={columnas}
                rol={rol}
                bloqueos={bloqueos}
                idArrastrada={idArrastrada}
                puedeSoltar={tareaArrastrada !== null && columnaOrigen !== columna.idGlobal}
                acciones={acciones}
                onSoltar={soltarEn}
              />
            ))}
          </div>
        )}
      </div>

      {edicion !== undefined && (
        <ModalTarea
          key={edicion?.idTarea ?? 'nueva'}
          tarea={edicion}
          idAsignadoInicial={edicion ? columnaDe(edicion, idsColumnas) : null}
          asignables={columnas}
          onGuardar={guardar}
          onEliminar={edicion && puede(rol, 'tarea.eliminar') ? () => eliminar(edicion.idTarea) : undefined}
          onCerrar={() => setEdicion(undefined)}
          soloLectura={edicion !== null ? !puede(rol, 'tarea.editar') || !puedeEditarTarea : !puede(rol, 'tarea.crear')}
          banner={
            edicion ? (
              <BannerEdicion
                estado={estado}
                onReintentar={() => void reintentar()}
                onResolverConflicto={() => setConflictoAbierto(edicion.idGlobal)}
              />
            ) : undefined
          }
        />
      )}

      {conflictoAbierto && (
        <ModalConflicto
          clave={claveDe(conflictoAbierto)}
          onCerrar={() => setConflictoAbierto(null)}
          onResuelto={alResolverConflicto}
        />
      )}
    </PlantillaLayout>
  );
}