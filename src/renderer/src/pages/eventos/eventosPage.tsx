import { useEffect, useMemo, useState } from 'react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Evento, CrearEventoInput, ModificarEventoInput, Prioridad, Recordatorio, UnidadTiempo } from '../../types/eventos';
import { Categoria as CategoriaRegistro } from '../../types/categorias';
import '../../styles/eventos.css';

const USUARIO_ID_ACTUAL = 1;

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

export function EventosPage(): JSX.Element {
  const hoy = new Date();
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

  const [categoriasVisibles, setCategoriasVisibles] = useState<Set<string>>(new Set());
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

  const { inicio, dias } = useMemo(() => primerDiaYCantidad(anio, mesIndex), [anio, mesIndex]);

  useEffect(() => {
    cargarEventos();
  }, [anio, mesIndex]);

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function cargarEventos(): Promise<void> {
    setCargando(true);
    try {
      const desde = fechaLocalISO(anio, mesIndex, 1, '00:00');
      const hasta = `${formatoFechaISO(anio, mesIndex, dias)}T23:59:59`;
      const resultado = await window.api.listarEventos({
        usuarioId: USUARIO_ID_ACTUAL,
        desde,
        hasta,
      });
      setEventos(resultado);
    } finally {
      setCargando(false);
    }
  }

  async function cargarCategorias(): Promise<void> {
    const resultado: CategoriaRegistro[] = await window.api.listarCategorias({
      usuarioId: USUARIO_ID_ACTUAL,
    });
    setCategorias(resultado);
    // Todas tildadas por defecto la primera vez que se cargan.
    setCategoriasVisibles((prev) => {
      if (prev.size > 0) return prev;
      return new Set(resultado.map((c) => c.nombre));
    });
    if (resultado.length > 0 && !formCategoria) {
      setFormCategoria(resultado[0].nombre);
    }
  }

  async function agregarCategoria(): Promise<void> {
    const nombre = nuevaCategoriaNombre.trim();
    if (!nombre) return;
    await window.api.crearCategoria({ usuarioId: USUARIO_ID_ACTUAL, nombre });
    setNuevaCategoriaNombre('');
    await cargarCategorias();
    setCategoriasVisibles((prev) => new Set(prev).add(nombre));
  }

  async function guardarRenombreCategoria(id: number): Promise<void> {
    const nombre = categoriaEditandoNombre.trim();
    if (!nombre) {
      setCategoriaEditandoId(null);
      return;
    }
    await window.api.modificarCategoria({ id, nombre });
    setCategoriaEditandoId(null);
    await cargarCategorias();
  }

  async function eliminarCategoria(categoria: CategoriaRegistro): Promise<void> {
    await window.api.eliminarCategoria({ id: categoria.id });
    setCategoriasVisibles((prev) => {
      const siguiente = new Set(prev);
      siguiente.delete(categoria.nombre);
      return siguiente;
    });
    await cargarCategorias();
  }

  const eventosVisibles = useMemo(
    () => eventos.filter((e) => categoriasVisibles.has(e.categoria)),
    [eventos, categoriasVisibles]
  );

  function alternarCategoria(nombre: string): void {
    setCategoriasVisibles((prev) => {
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
    setEditandoId(null);
    setFormTitulo('');
    setFormDescripcion('');
    setFormCategoria(categorias[0]?.nombre ?? '');
    setFormPrioridad('media');
    setFormHora('09:00');
    setFormNotificacionesActivas(false);
    setFormRecordatorios([]);
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirModalEditarEvento(evento: Evento): void {
    if (evento.id < 0) return;
    setEditandoId(evento.id);
    setFormTitulo(evento.titulo);
    setFormDescripcion(evento.descripcion ?? '');
    setFormCategoria(evento.categoria ?? categorias[0]?.nombre ?? '');
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
          titulo: formTitulo.trim(),
          descripcion: formDescripcion.trim() || null,
          categoria: formCategoria,
          prioridad: formPrioridad,
          fecha: fechaLocalISO(anio, mesIndex, diaSeleccionado, formHora),
          notificacionesActivas: formNotificacionesActivas,
          recordatorios: formNotificacionesActivas ? formRecordatorios : [],
        };
        await window.api.modificarEvento(cambios);
      } else {
        const nuevoEvento: CrearEventoInput = {
          usuarioId: USUARIO_ID_ACTUAL,
          titulo: formTitulo.trim(),
          descripcion: formDescripcion.trim() || null,
          lugar: null,
          fecha: fechaLocalISO(anio, mesIndex, diaSeleccionado, formHora),
          categoria: formCategoria,
          prioridad: formPrioridad,
          notificacionesActivas: formNotificacionesActivas,
          recordatorios: formNotificacionesActivas ? formRecordatorios : [],
        };
        await window.api.crearEvento(nuevoEvento);
      }

      setEditandoId(null);
      setModalAbierto(false);
      await cargarEventos();
    } catch (err) {
      console.error('Error al guardar evento:', err);
      setErrorForm('No se pudo guardar el evento. Revisá la consola para más detalles.');
    }
  }

  async function eliminarEvento(id: number): Promise<void> {
    if (id < 0) return;
    await window.api.eliminarEvento({ id });
    await cargarEventos();
  }

  const celdas: (number | null)[] = [
    ...Array(inicio).fill(null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];

  return (
    <PlantillaLayout
      titulo="Calendario"
      idActivo="calendario"
      usuario={{ nombre: usuarioLogueado }}
      onBuscar={setBusqueda}
    >
      <div className="eventos-page">
        <p className="eventos-instructivo">Seleccione la fecha e ingrese la actividad a registrar</p>

        <div className="eventos-columnas">
          <div className="eventos-col-calendario">
            <div className="eventos-encabezado">
              <h2 className="eventos-subtitulo">{NOMBRES_MES[mesIndex]} - {anio}</h2>
              <div className="eventos-acciones">
                <button className="eventos-boton-nav" onClick={() => cambiarMes(-1)}>‹</button>
                <button className="eventos-boton-nav" onClick={() => cambiarMes(1)}>›</button>
                <button className="eventos-boton-primario" onClick={abrirModalNuevoEvento}>+ Nuevo Evento</button>
              </div>
            </div>

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
                        title={evento.id < 0 ? `${evento.titulo} (clase recurrente)` : evento.titulo}
                      >
                        {evento.titulo}
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
              {categorias.map((cat) => (
                <div key={cat.id} className="eventos-fila-categoria">
                  <input
                    type="checkbox"
                    checked={categoriasVisibles.has(cat.nombre)}
                    onChange={() => alternarCategoria(cat.nombre)}
                  />
                  {categoriaEditandoId === cat.id ? (
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
                        setCategoriaEditandoId(cat.id);
                        setCategoriaEditandoNombre(cat.nombre);
                      }}
                      title="Tocar para renombrar"
                    >
                      {cat.nombre}
                    </span>
                  )}
                  <button
                    className="eventos-boton-quitar-categoria"
                    onClick={() => eliminarCategoria(cat)}
                    aria-label={`Eliminar categoría ${cat.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
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
                  <div className="eventos-tarjeta-acciones">
                    <button className="eventos-boton-nav" onClick={() => abrirModalEditarEvento(evento)}>Editar</button>
                    <button className="eventos-boton-nav eventos-boton-nav--peligro" onClick={() => eliminarEvento(evento.id)}>Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {modalAbierto && (
            <div className="eventos-overlay">
              <div className="eventos-modal">
                <h3 className="eventos-modal-titulo">{editandoId !== null ? 'Editar Evento' : 'Nuevo Evento'}</h3>

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
                <select className="eventos-input" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>

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
                  <button className="eventos-boton-guardar" onClick={guardarEvento}>
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
