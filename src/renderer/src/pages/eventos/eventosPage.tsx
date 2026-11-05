import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Evento, CrearEventoInput, ModificarEventoInput, Prioridad, Recordatorio, UnidadTiempo } from '../../types/eventos';
import { Categoria as CategoriaRegistro } from '../../types/categorias';
import type { RolMiembro } from '../../types/proyectos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { puede, rolDe } from '../../permisos';
import { useCambiosRemotos } from '../../hooks/useCambiosRemotos';
import { useEdicionDeElemento } from '../../hooks/useEdicionCompartida';
import { BannerEdicion } from '../../components/proyectos/bannerEdicion';
import { ConflictosProyecto } from '../../components/proyectos/conflictosProyecto';
import '../../styles/eventos.css';

const UNIDADES: { valor: UnidadTiempo; etiqueta: string }[] = [
  { valor: 'minutos', etiqueta: 'minutos' },
  { valor: 'horas', etiqueta: 'horas' },
  { valor: 'dias', etiqueta: 'días' },
  { valor: 'semanas', etiqueta: 'semanas' },
];

const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  leve: 'Leve',
  media: 'Media',
  importante: 'Importante',
};

const MAX_EVENTOS_VISIBLES_POR_DIA = 3;

function primerDiaYCantidad(anio: number, mesIndex: number): { inicio: number; dias: number } {
  const inicio = new Date(anio, mesIndex, 1).getDay();
  const dias = new Date(anio, mesIndex + 1, 0).getDate();
  return { inicio, dias };
}

function formatoFechaISO(anio: number, mesIndex: number, dia: number): string {
  const mm = String(mesIndex + 1).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${anio}-${mm}-${dd}`;
}

function fechaLocalISO(anio: number, mesIndex: number, dia: number, hora: string): string {
  return `${formatoFechaISO(anio, mesIndex, dia)}T${hora}:00`;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function mensajeDeError(err: unknown, porDefecto: string): string {
  // Electron antepone "Error invoking remote method ...: Error: " al mensaje real.
  const texto = err instanceof Error ? err.message : '';
  const limpio = texto.replace(/^Error invoking remote method '[^']*': (Error: )?/, '').trim();
  return limpio || porDefecto;
}

function EventosContenido({ usuarioId }: { usuarioId: number }): JSX.Element {
  const hoy = new Date();
  const navigate = useNavigate();
  const location = useLocation();

  // Modo proyecto: la ruta /proyectos/:id/eventos trae el id del proyecto.
  // En /eventos no hay id: se muestran los eventos personales + los de todos mis proyectos.
  const { id: idParametro } = useParams();
  const idProyecto = idParametro ? Number(idParametro) : undefined;
  const [nombreProyecto, setNombreProyecto] = useState<string | null>(null);

  // Rol en el proyecto (solo en modo proyecto). En /eventos los eventos personales son del usuario;
  // los de proyectos que aparecen ahí los valida el main según el rol que tenga en cada uno.
  const [rolProyecto, setRolProyecto] = useState<RolMiembro | null>(null);
  const rol: RolMiembro | null = idProyecto === undefined ? 'propietario' : rolProyecto;

  const [busqueda, setBusqueda] = useState('');
  const usuarioLogueado = 'Usuario';

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesIndex, setMesIndex] = useState(hoy.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRegistro[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(hoy.getDate());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Se guardan las ocultas (no las visibles): una categoría nueva, propia o llegada por sincronización, aparece tildada.
  const [categoriasOcultas, setCategoriasOcultas] = useState<Set<string>>(new Set());
  // Grupos de categorías de proyecto desplegados (en /eventos arrancan plegados para ocupar poco lugar).
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());
  const [errorCategoria, setErrorCategoria] = useState<string | null>(null);
  // Proyecto del evento que se está editando/creando: define qué categorías ofrece el formulario.
  const [formIdProyecto, setFormIdProyecto] = useState<number | null>(null);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<number | null>(null);
  const [categoriaEditandoNombre, setCategoriaEditandoNombre] = useState('');

  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formPrioridad, setFormPrioridad] = useState<Prioridad>('media');
  const [formHora, setFormHora] = useState('09:00');
  const [formNotificacionesActivas, setFormNotificacionesActivas] = useState(false);
  const [formRecordatorios, setFormRecordatorios] = useState<Recordatorio[]>([]);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  // Editar un evento de un proyecto compartido toma el bloqueo mientras el formulario está abierto.
  const edicionEvento = useEdicionDeElemento('evento', modalAbierto && editandoId !== null && editandoId > 0 ? editandoId : null);

  const { inicio, dias } = useMemo(() => primerDiaYCantidad(anio, mesIndex), [anio, mesIndex]);

  // Nombre del proyecto (solo en modo proyecto)
  useEffect(() => {
    if (idProyecto === undefined) {
      setNombreProyecto(null);
      return;
    }
    window.api
      .obtenerProyecto({ idProyecto, idUsuario: usuarioId })
      .then((p: { nombre: string }) => setNombreProyecto(p.nombre))
      .catch(console.error);
  }, [idProyecto, usuarioId]);

  // Rol del usuario en el proyecto (solo en modo proyecto)
  useEffect(() => {
    if (idProyecto === undefined) {
      setRolProyecto(null);
      return;
    }
    window.api
      .listarMiembros({ idProyecto, idUsuarioSolicitante: usuarioId })
      .then((m) => setRolProyecto(rolDe(m, usuarioId)))
      .catch((e) => {
        console.error(e);
        setRolProyecto(null);
      });
  }, [idProyecto, usuarioId]);

  // Si se llega desde el MiniCalendario con una fecha, se selecciona ese día
  useEffect(() => {
    const fecha = (location.state as { fecha?: string } | null)?.fecha;
    if (!fecha) return;
    const [a, m, d] = fecha.split('-').map(Number);
    if (!a || !m || !d) return;
    setAnio(a);
    setMesIndex(m - 1);
    setDiaSeleccionado(d);
  }, [location.state]);

  useEffect(() => {
    cargarEventos();
  }, [anio, mesIndex, idProyecto, usuarioId]);

  useEffect(() => {
    cargarCategorias();
  }, [usuarioId, idProyecto]);

  // Cambios que llegan de otras PCs. En modo proyecto solo escucha ese proyecto;
  // en /eventos escucha todos (muestra personales + los de mis proyectos).
  // La recarga es silenciosa para que no parpadee el "Cargando...".
  useCambiosRemotos(idProyecto ?? 'todos', () => {
    cargarEventos(true).catch(console.error);
    cargarCategorias().catch(console.error);
  });

  async function cargarEventos(silencioso = false): Promise<void> {
    if (!silencioso) setCargando(true);
    try {
      const desde = fechaLocalISO(anio, mesIndex, 1, '00:00');
      const hasta = `${formatoFechaISO(anio, mesIndex, dias)}T23:59:59`;
      const resultado = await window.api.listarEventos({
        usuarioId,
        idProyecto, // undefined en /eventos
        desde,
        hasta,
      });
      setEventos(resultado);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }

  // En un proyecto: solo las de ese proyecto (compartidas). En /eventos: las personales y, aparte,
  // las de mis proyectos (solo para filtrar).
  const puedeGestionarCategorias = puede(rol, 'evento.editar'); // crear/editar/eliminar: propietario y editor

  const gruposCategorias = useMemo(() => {
    type Item = { nombre: string; registro?: CategoriaRegistro; editable: boolean };
    const propias = categorias.filter((c) => idProyecto !== undefined || c.idProyecto == null);
    const grupos: { clave: string; titulo: string | null; items: Item[] }[] = [{
      clave: 'propias',
      titulo: null,
      items: propias.map((registro) => ({
        nombre: registro.nombre, registro, editable: puedeGestionarCategorias,
      })),
    }];
    if (idProyecto === undefined) {
      // Las de proyectos se muestran por proyecto, solo para tildar/destildar (se editan dentro del proyecto).
      for (const c of categorias.filter((x) => x.idProyecto != null)) {
        const clave = `p${c.idProyecto}`;
        let g = grupos.find((x) => x.clave === clave);
        if (!g) {
          g = { clave, titulo: c.nombreProyecto ?? `Proyecto ${c.idProyecto}`, items: [] };
          grupos.push(g);
        }
        g.items.push({ nombre: c.nombre, registro: c, editable: false });
      }
    }
    return grupos;
  }, [categorias, idProyecto, puedeGestionarCategorias]);

  // Nombres que ofrece el formulario de evento según el proyecto al que pertenece (null = personal).
  function opcionesCategoria(idProy: number | null, actual?: string): string[] {
    const propias = categorias.filter((c) => (c.idProyecto ?? null) === idProy).map((c) => c.nombre);
    const nombres = [...propias];
    if (actual && !nombres.includes(actual)) nombres.push(actual);
    return nombres;
  }
  const opcionesForm = useMemo(
    () => opcionesCategoria(formIdProyecto, formCategoria),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorias, formIdProyecto, formCategoria]
  );

  async function cargarCategorias(): Promise<void> {
    // En un proyecto: solo las de ese proyecto. En /eventos: personales + las de mis proyectos.
    const resultado: CategoriaRegistro[] = await window.api.listarCategorias({ usuarioId, idProyecto });
    setCategorias(resultado);
  }

  async function agregarCategoria(): Promise<void> {
    const nombre = nuevaCategoriaNombre.trim();
    if (!nombre) return;
    const existe = gruposCategorias[0].items.some((i) => i.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
      setErrorCategoria('Ya existe una categoría con ese nombre.');
      return;
    }
    try {
      setErrorCategoria(null);
      await window.api.crearCategoria({ usuarioId, idProyecto, nombre });
      setNuevaCategoriaNombre('');
      await cargarCategorias();
    } catch (err) {
      setErrorCategoria(mensajeDeError(err, 'No se pudo crear la categoría.'));
    }
  }

  async function guardarRenombreCategoria(id: number): Promise<void> {
    const nombre = categoriaEditandoNombre.trim();
    const actual = categorias.find((c) => c.id === id);
    setCategoriaEditandoId(null);
    if (!nombre || !actual || nombre === actual.nombre) return;
    try {
      setErrorCategoria(null);
      await window.api.modificarCategoria({ usuarioId, id, nombre });
      await cargarCategorias();
    } catch (err) {
      setErrorCategoria(mensajeDeError(err, 'No se pudo renombrar la categoría.'));
    }
  }

  async function eliminarCategoria(categoria: CategoriaRegistro): Promise<void> {
    try {
      setErrorCategoria(null);
      await window.api.eliminarCategoria({ usuarioId, id: categoria.id });
      await cargarCategorias();
    } catch (err) {
      setErrorCategoria(mensajeDeError(err, 'No se pudo eliminar la categoría.'));
    }
  }

  // Los eventos guardan la categoría como texto: solo se ocultan las que el usuario destildó.
  const eventosVisibles = useMemo(
    () => eventos.filter((e) => !categoriasOcultas.has(e.categoria)),
    [eventos, categoriasOcultas]
  );

  function alternarGrupo(clave: string): void {
    setGruposAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });
  }

  function alternarCategoria(nombre: string): void {
    setCategoriasOcultas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(nombre)) siguiente.delete(nombre);
      else siguiente.add(nombre);
      return siguiente;
    });
  }

  function eventosDelDia(dia: number): Evento[] {
    const fechaBuscada = formatoFechaISO(anio, mesIndex, dia);
    return eventosVisibles.filter((evento) => {
      const fechaEvento = new Date(evento.fecha);
      const fechaEventoISO = formatoFechaISO(
        fechaEvento.getFullYear(),
        fechaEvento.getMonth(),
        fechaEvento.getDate()
      );
      return fechaEventoISO === fechaBuscada;
    });
  }

  function cambiarMes(delta: number): void {
    const nuevo = new Date(anio, mesIndex + delta, 1);
    setAnio(nuevo.getFullYear());
    setMesIndex(nuevo.getMonth());
  }

  function abrirModalNuevoEvento(): void {
    if (!puede(rol, 'evento.crear')) return;
    setEditandoId(null);
    setFormTitulo('');
    setFormDescripcion('');
    const idProy = idProyecto ?? null;
    setFormIdProyecto(idProy);
    setFormCategoria(opcionesCategoria(idProy)[0] ?? '');
    setFormPrioridad('media');
    setFormHora('09:00');
    setFormNotificacionesActivas(false);
    setFormRecordatorios([]);
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirModalEditarEvento(evento: Evento): void {
    if (evento.id < 0 || !puede(rol, 'evento.editar')) return;
    setEditandoId(evento.id);
    setFormTitulo(evento.titulo);
    setFormDescripcion(evento.descripcion ?? '');
    const idProy = evento.idProyecto ?? idProyecto ?? null;
    setFormIdProyecto(idProy);
    setFormCategoria(evento.categoria ?? opcionesCategoria(idProy)[0] ?? '');
    setFormPrioridad(evento.prioridad ?? 'media');
    const fechaEvento = new Date(evento.fecha);
    const hh = String(fechaEvento.getHours()).padStart(2, '0');
    const mm = String(fechaEvento.getMinutes()).padStart(2, '0');
    setFormHora(`${hh}:${mm}`);
    setFormNotificacionesActivas(evento.notificacionesActivas ?? false);
    setFormRecordatorios((evento.recordatorios ?? []).map((r) => ({ ...r })));
    setErrorForm(null);
    setModalAbierto(true);
  }

  function cambiarNotificacionesActivas(activas: boolean): void {
    setFormNotificacionesActivas(activas);
    if (!activas) {
      setFormRecordatorios([]);
    } else if (formRecordatorios.length === 0) {
      setFormRecordatorios([{ cantidad: 10, unidad: 'minutos' }]);
    }
  }

  function agregarRecordatorio(): void {
    setFormRecordatorios((prev) => [...prev, { cantidad: 10, unidad: 'minutos' }]);
  }

  function eliminarRecordatorio(indice: number): void {
    setFormRecordatorios((prev) => prev.filter((_, i) => i !== indice));
  }

  function actualizarRecordatorio(indice: number, cambios: Partial<Recordatorio>): void {
    setFormRecordatorios((prev) => prev.map((r, i) => (i === indice ? { ...r, ...cambios } : r)));
  }

  async function guardarEvento(): Promise<void> {
    if (!puede(rol, editandoId !== null ? 'evento.editar' : 'evento.crear')) {
      setErrorForm('Tu rol en este proyecto no permite hacer esto.');
      return;
    }
    if (editandoId !== null && !edicionEvento.puedeEditar) {
      setErrorForm('Ahora no se puede editar este evento: mirá el aviso de arriba.');
      return;
    }
    if (!formTitulo.trim()) {
      setErrorForm('El nombre del evento es obligatorio.');
      return;
    }
    if (formNotificacionesActivas && formRecordatorios.length === 0) {
      setErrorForm('Agregá al menos un recordatorio o desactivá las notificaciones.');
      return;
    }

    try {
      setErrorForm(null);

      if (editandoId !== null) {
        const cambios: ModificarEventoInput = {
          id: editandoId,
          usuarioId,
          titulo: formTitulo.trim(),
          descripcion: formDescripcion.trim() || null,
          categoria: formCategoria || 'Otro', // sin categorías en el contexto: queda 'Otro'
          prioridad: formPrioridad,
          fecha: fechaLocalISO(anio, mesIndex, diaSeleccionado, formHora),
          notificacionesActivas: formNotificacionesActivas,
          recordatorios: formNotificacionesActivas ? formRecordatorios : [],
        };
        await window.api.modificarEvento(cambios);
        // Sube la versión nueva al resto del proyecto (si es personal no hace nada).
        if (edicionEvento.clave) await edicionEvento.guardar();
      } else {
        const nuevoEvento: CrearEventoInput = {
          usuarioId,
          idProyecto, // undefined → evento personal; con valor → evento del proyecto
          titulo: formTitulo.trim(),
          descripcion: formDescripcion.trim() || null,
          lugar: null,
          fecha: fechaLocalISO(anio, mesIndex, diaSeleccionado, formHora),
          categoria: formCategoria || 'Otro', // sin categorías en el contexto: queda 'Otro'
          prioridad: formPrioridad,
          notificacionesActivas: formNotificacionesActivas,
          recordatorios: formNotificacionesActivas ? formRecordatorios : [],
        };
        await window.api.crearEvento(nuevoEvento);
      }

      setEditandoId(null);
      setModalAbierto(false);
      await cargarEventos();
      // Si el recordatorio ya tendría que haber sonado (por ejemplo, un evento dentro de 5 minutos
      // con aviso 10 minutos antes), sale ahora y no recién en la próxima revisión del minuto.
      if (formNotificacionesActivas) window.api.vigilarNotificaciones({ usuarioId }).catch(console.error);
    } catch (err) {
      console.error('Error al guardar evento:', err);
      setErrorForm('No se pudo guardar el evento. Revisá la consola para más detalles.');
    }
  }

  async function eliminarEvento(id: number): Promise<void> {
    if (id < 0 || !puede(rol, 'evento.eliminar')) return;
    try {
      await window.api.eliminarEvento({ id, usuarioId });
      await cargarEventos();
    } catch (err) {
      console.error('Error al eliminar evento:', err);
      window.alert('No se pudo eliminar el evento.');
    }
  }

  const celdas: (number | null)[] = [
    ...Array(inicio).fill(null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];

  return (
    <PlantillaLayout
      titulo={idProyecto ? `Calendario · ${nombreProyecto ?? ''}` : 'Calendario'}
      idActivo={idProyecto ? 'proyectos' : 'calendario'}
      usuario={{ nombre: usuarioLogueado }}
      onBuscar={setBusqueda}
    >
      <div className="eventos-page">
        {idProyecto && (
          <button
            type="button"
            className="eventos-boton-nav"
            onClick={() => navigate(`/proyectos/${idProyecto}`)}
          >
            ← Volver al proyecto
          </button>
        )}

        <p className="eventos-instructivo">
          {idProyecto
            ? puede(rol, 'evento.crear')
              ? 'Eventos del proyecto. Seleccione la fecha e ingrese la actividad a registrar'
              : 'Eventos del proyecto. Tu rol es de solo lectura'
            : 'Seleccione la fecha e ingrese la actividad a registrar'}
        </p>

        <div className="eventos-columnas">
          <div className="eventos-col-calendario">
            <div className="eventos-encabezado">
              <h2 className="eventos-subtitulo">{NOMBRES_MES[mesIndex]} - {anio}</h2>
              <div className="eventos-acciones">
                <button className="eventos-boton-nav" onClick={() => cambiarMes(-1)}>‹</button>
                <button className="eventos-boton-nav" onClick={() => cambiarMes(1)}>›</button>
                {puede(rol, 'evento.crear') && (
                  <button className="eventos-boton-primario" onClick={abrirModalNuevoEvento}>+ Nuevo Evento</button>
                )}
              </div>
            </div>

            <ConflictosProyecto idProyecto={idProyecto} entidad="evento" onResuelto={() => void cargarEventos()} />

            <div className="eventos-grilla">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((letra, i) => (
                <div key={i} className="eventos-dia-semana">{letra}</div>
              ))}

              {celdas.map((dia, i) => {
                if (dia === null) {
                  return <div key={i} className="eventos-celda-vacia" />;
                }
                const eventosDia = eventosDelDia(dia);
                const seleccionado = dia === diaSeleccionado;
                const visibles = eventosDia.slice(0, MAX_EVENTOS_VISIBLES_POR_DIA);
                const restantes = eventosDia.length - visibles.length;

                return (
                  <div
                    key={i}
                    className={`eventos-celda${seleccionado ? ' eventos-celda--seleccionada' : ''}`}
                    onClick={() => setDiaSeleccionado(dia)}
                  >
                    <span className="eventos-celda-numero">{dia}</span>

                    {visibles.map((evento) => (
                      <div
                        key={evento.id}
                        className={`eventos-pildora eventos-prioridad--${evento.prioridad}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditarEvento(evento);
                        }}
                        title={
                          evento.id < 0
                            ? `${evento.titulo} (clase recurrente)`
                            : evento.nombreProyecto
                              ? `${evento.titulo} · ${evento.nombreProyecto}`
                              : evento.titulo
                        }
                      >
                        {evento.titulo}
                        {!idProyecto && evento.nombreProyecto && (
                          <span className="eventos-chip-proyecto"> · {evento.nombreProyecto}</span>
                        )}
                      </div>
                    ))}

                    {restantes > 0 && <span className="eventos-mas">+{restantes} más</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="eventos-col-lateral">
            <h3 className="eventos-subtitulo-chico">Categorías</h3>
            <div className="eventos-categorias">
              {gruposCategorias.map((grupo) => (
                <div key={grupo.clave}>
                  {grupo.titulo && (
                    <button
                      type="button"
                      className="eventos-categoria-grupo"
                      onClick={() => alternarGrupo(grupo.clave)}
                      aria-expanded={gruposAbiertos.has(grupo.clave)}
                      style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
                               background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
                               color: 'inherit', font: 'inherit', fontWeight: 600 }}
                    >
                      <span>{grupo.titulo}</span>
                      <span>{gruposAbiertos.has(grupo.clave) ? '▾' : '▸'} {grupo.items.length}</span>
                    </button>
                  )}
                  {(!grupo.titulo || gruposAbiertos.has(grupo.clave)) && grupo.items.map((item) => {
                    const cat = item.registro;
                    return (
                      <div key={`${grupo.clave}:${item.nombre}`} className="eventos-fila-categoria">
                        <input
                          type="checkbox"
                          checked={!categoriasOcultas.has(item.nombre)}
                          onChange={() => alternarCategoria(item.nombre)}
                        />
                        {cat && categoriaEditandoId === cat.id ? (
                          <input
                            autoFocus
                            className="eventos-input-inline"
                            value={categoriaEditandoNombre}
                            onChange={(e) => setCategoriaEditandoNombre(e.target.value)}
                            onBlur={() => guardarRenombreCategoria(cat.id)}
                            onKeyDown={(e) => e.key === 'Enter' && guardarRenombreCategoria(cat.id)}
                          />
                        ) : (
                          <span
                            className="eventos-categoria-nombre"
                            onClick={() => {
                              if (!cat || !item.editable) return;
                              setCategoriaEditandoId(cat.id);
                              setCategoriaEditandoNombre(cat.nombre);
                            }}
                            title={cat && item.editable ? 'Tocar para renombrar' : undefined}
                          >
                            {item.nombre}
                          </span>
                        )}
                        {cat && item.editable && (
                          <button
                            className="eventos-boton-quitar-categoria"
                            onClick={() => eliminarCategoria(cat)}
                            aria-label={`Eliminar categoría ${cat.nombre}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {puedeGestionarCategorias && (
                <div className="eventos-nueva-categoria">
                  <input
                    className="eventos-input-inline"
                    placeholder="Nueva categoría..."
                    value={nuevaCategoriaNombre}
                    onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                  />
                  <button className="eventos-boton-nav" onClick={agregarCategoria}>+</button>
                </div>
              )}
              {errorCategoria && <div className="eventos-error">{errorCategoria}</div>}
            </div>

            <h3 className="eventos-subtitulo-chico">Eventos del día</h3>
            {cargando && <p className="eventos-texto-secundario">Cargando...</p>}
            {!cargando && eventosDelDia(diaSeleccionado).length === 0 && (
              <p className="eventos-texto-secundario">No hay eventos para este día.</p>
            )}
            {eventosDelDia(diaSeleccionado).map((evento) => (
              <div key={evento.id} className={`eventos-tarjeta eventos-prioridad--${evento.prioridad}`}>
                <div className="eventos-tarjeta-cabecera">
                  <div className="eventos-tarjeta-titulo">{evento.titulo}</div>
                  <span className="eventos-badge">{evento.categoria}</span>
                </div>
                {!idProyecto && evento.nombreProyecto && (
                  <div className="eventos-tarjeta-meta">Proyecto: {evento.nombreProyecto}</div>
                )}
                <div className="eventos-tarjeta-meta">
                  {new Date(evento.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {evento.descripcion && (
                  <div className="eventos-tarjeta-descripcion">{evento.descripcion}</div>
                )}
                {evento.notificacionesActivas && evento.recordatorios.length > 0 && (
                  <div className="eventos-tarjeta-meta eventos-tarjeta-meta--sep">
                    {evento.recordatorios
                      .map((r) => `${r.cantidad} ${UNIDADES.find((u) => u.valor === r.unidad)?.etiqueta}`)
                      .join(' · ')}
                  </div>
                )}
                {evento.id < 0 ? (
                  <div className="eventos-tarjeta-meta eventos-tarjeta-meta--sep">
                    Clase recurrente — se edita desde "Horarios de cursado"
                  </div>
                ) : (
                  (puede(rol, 'evento.editar') || puede(rol, 'evento.eliminar')) && (
                    <div className="eventos-tarjeta-acciones">
                      {puede(rol, 'evento.editar') && (
                        <button className="eventos-boton-nav" onClick={() => abrirModalEditarEvento(evento)}>Editar</button>
                      )}
                      {puede(rol, 'evento.eliminar') && (
                        <button className="eventos-boton-nav eventos-boton-nav--peligro" onClick={() => eliminarEvento(evento.id)}>Eliminar</button>
                      )}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          {modalAbierto && (
            <div className="eventos-overlay">
              <div className="eventos-modal">
                <h3 className="eventos-modal-titulo">{editandoId !== null ? 'Editar Evento' : 'Nuevo Evento'}</h3>
                {editandoId !== null && edicionEvento.clave && (
                  <BannerEdicion estado={edicionEvento.estado} onReintentar={() => void edicionEvento.reintentar()} />
                )}
                {idProyecto && nombreProyecto && editandoId === null && (
                  <p className="eventos-texto-secundario">Se registrará en el proyecto «{nombreProyecto}».</p>
                )}

                <input
                  className="eventos-input"
                  placeholder="Ingrese el nombre del nuevo evento..."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                />
                <textarea
                  className="eventos-input eventos-input--area"
                  placeholder="Ingrese una breve descripción del nuevo evento..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                />

                <label className="eventos-etiqueta">Categoría</label>
                {opcionesForm.length > 0 ? (
                  <select className="eventos-input" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                    {opcionesForm.map((nombre) => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                ) : (
                  <p className="eventos-texto-secundario">
                    {formIdProyecto !== null
                      ? 'Este proyecto todavía no tiene categorías: el evento quedará como «Otro».'
                      : 'No tenés categorías personales: el evento quedará como «Otro».'}
                  </p>
                )}

                <label className="eventos-etiqueta">Hora</label>
                <input
                  className="eventos-input"
                  type="time"
                  value={formHora}
                  onChange={(e) => setFormHora(e.target.value)}
                />

                <label className="eventos-etiqueta">Prioridad</label>
                <div className="eventos-prioridades">
                  {(['leve', 'media', 'importante'] as Prioridad[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`eventos-prioridad-boton eventos-prioridad--${p}${formPrioridad === p ? ' eventos-prioridad-boton--activa' : ''}`}
                      onClick={() => setFormPrioridad(p)}
                    >
                      {ETIQUETA_PRIORIDAD[p]}
                    </button>
                  ))}
                </div>

                <p className="eventos-pregunta-notif">¿Desea activar notificaciones para el evento?</p>
                <div className="eventos-opciones-notif">
                  <label className="eventos-opcion-radio">
                    <input type="radio" checked={formNotificacionesActivas} onChange={() => cambiarNotificacionesActivas(true)} /> Sí
                  </label>
                  <label className="eventos-opcion-radio">
                    <input type="radio" checked={!formNotificacionesActivas} onChange={() => cambiarNotificacionesActivas(false)} /> No
                  </label>
                </div>

                {formNotificacionesActivas && (
                  <div className="eventos-recordatorios">
                    {formRecordatorios.map((rec, indice) => (
                      <div key={indice} className="eventos-fila-recordatorio">
                        <span className="eventos-etiqueta-recordatorio">Notificación</span>
                        <input
                          className="eventos-input-numero"
                          type="number"
                          min={1}
                          max={999}
                          value={rec.cantidad}
                          onChange={(e) => actualizarRecordatorio(indice, { cantidad: Number(e.target.value) || 1 })}
                        />
                        <select
                          className="eventos-select-unidad"
                          value={rec.unidad}
                          onChange={(e) => actualizarRecordatorio(indice, { unidad: e.target.value as UnidadTiempo })}
                        >
                          {UNIDADES.map((u) => (
                            <option key={u.valor} value={u.valor}>{u.etiqueta}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="eventos-boton-quitar-recordatorio"
                          onClick={() => eliminarRecordatorio(indice)}
                          aria-label="Quitar recordatorio"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button type="button" className="eventos-agregar-recordatorio" onClick={agregarRecordatorio}>
                      + Agregar notificación
                    </button>
                  </div>
                )}

                {errorForm && <div className="eventos-error">{errorForm}</div>}

                <div className="eventos-modal-acciones">
                  <button className="eventos-boton-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                  <button className="eventos-boton-guardar" onClick={guardarEvento}
                    disabled={editandoId !== null && !edicionEvento.puedeEditar}>
                    {editandoId !== null ? 'Guardar cambios' : '+'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PlantillaLayout>
  );
}

// Lee la sesión; si no hay usuario logueado, vuelve al login.
export function EventosPage(): JSX.Element {
  const usuarioId = obtenerUsuarioId();
  if (usuarioId === null) return <Navigate to="/login" replace />;
  return <EventosContenido usuarioId={usuarioId} />;
}