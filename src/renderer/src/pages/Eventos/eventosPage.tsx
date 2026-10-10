import { useEffect, useMemo, useState } from 'react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Evento, CrearEventoInput, ModificarEventoInput, Categoria, CATEGORIAS, Prioridad, Recordatorio, UnidadTiempo} from '../../types/eventos';

import { Categoria as CategoriaRegistro } from '../../types/categorias';


const USUARIO_ID_ACTUAL = 1;

const UNIDADES: { valor: UnidadTiempo; etiqueta: string }[] = [
  { valor: 'minutos', etiqueta: 'minutos' },
  { valor: 'horas', etiqueta: 'horas' },
  { valor: 'dias', etiqueta: 'días' },
  { valor: 'semanas', etiqueta: 'semanas' },
];

const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  leve: colors.success,
  media: colors.accent,
  importante: colors.error,
};

const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  leve: 'Leve',
  media: 'Media',
  importante: 'Importante',
};

const MAX_EVENTOS_VISIBLES_POR_DIA = 3;

const CATEGORIA_CLASES_RECURRENTES = 'Clases';

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
  //layout
  const hoy = new Date();
  const [busqueda, setBusqueda] = useState('');
  const usuarioLogueado = 'Usuario';

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesIndex, setMesIndex] = useState(hoy.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  //const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
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
    //cargarHorarios();
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

  /*async function cargarHorarios(): Promise<void> {
    const resultado = await window.api.listarHorarios({ usuarioId: USUARIO_ID_ACTUAL });
    setHorarios(resultado);
  }
  */

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

 /*
  function eventosVirtualesDelDia(dia: number): Evento[] {
    if (!categoriasVisibles.has(CATEGORIA_CLASES_RECURRENTES)) return [];
    const diaSemana = new Date(anio, mesIndex, dia).getDay();
    return horarios
      .filter((h) => h.diaSemana === diaSemana)
      .map((h) => {
        const [hh, mm] = h.horaInicio.split(':').map(Number);
        return {
          id: -h.id, // id negativo = marca que es virtual, no una fila real
          usuarioId: USUARIO_ID_ACTUAL,
          titulo: h.titulo,
          descripcion: `Clase recurrente · ${h.horaInicio}`,
          lugar: null,
          fecha: new Date(anio, mesIndex, dia, hh, mm),
          categoria: CATEGORIA_CLASES_RECURRENTES,
          prioridad: 'leve' as Prioridad,
          notificacionesActivas: false,
          recordatorios: [],
        }; 
      });
  }*/

  function eventosDelDia(dia: number): Evento[] {
    const fechaBuscada = formatoFechaISO(anio, mesIndex, dia);
    const reales = eventosVisibles.filter((evento) => {
      const fechaEvento = new Date(evento.fecha);
      const fechaEventoISO = formatoFechaISO(
        fechaEvento.getFullYear(),
        fechaEvento.getMonth(),
        fechaEvento.getDate()
      );
      return fechaEventoISO === fechaBuscada;
    });
    return reales
    //return [...eventosVirtualesDelDia(dia), ...reales];
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
      <div style={{ padding: spacing.lg }}>
        <p style={estiloTextoInstructivo}>Seleccione la fecha e ingrese la actividad a registrar</p>

        <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start' }}>
          <div style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <h2 style={estiloSubtitulo}>{NOMBRES_MES[mesIndex]} - {anio}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <button onClick={() => cambiarMes(-1)} style={estiloBotonNav}>‹</button>
                <button onClick={() => cambiarMes(1)} style={estiloBotonNav}>›</button>
                <button onClick={abrirModalNuevoEvento} style={estiloBotonPrimario}>+ Nuevo Evento</button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: 2,
                background: colors.border,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((letra, i) => (
                <div key={i} style={estiloCabeceraDiaSemana}>{letra}</div>
              ))}

              {celdas.map((dia, i) => {
                if (dia === null) {
                  return <div key={i} style={{ background: colors.surface, height: 92 }} />;
                }
                const eventosDia = eventosDelDia(dia);
                const seleccionado = dia === diaSeleccionado;
                const visibles = eventosDia.slice(0, MAX_EVENTOS_VISIBLES_POR_DIA);
                const restantes = eventosDia.length - visibles.length;

                return (
                  <div
                    key={i}
                    onClick={() => setDiaSeleccionado(dia)}
                    style={{
                      background: seleccionado ? colors.primaryLight : colors.surface,
                      height: 92,
                      minWidth: 0,
                      overflow: 'hidden',
                      padding: spacing.xs,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: seleccionado ? colors.surface : colors.textPrimary }}>
                      {dia}
                    </span>

                    {visibles.map((evento) => (
                      <div
                        key={evento.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditarEvento(evento);
                        }}
                        title={evento.id < 0 ? `${evento.titulo} (clase recurrente)` : evento.titulo}
                        style={estiloPildoraEvento(COLOR_PRIORIDAD[evento.prioridad])}
                      >
                        {evento.titulo}
                      </div>
                    ))}

                    {restantes > 0 && (
                      <span style={{ fontSize: 10, color: seleccionado ? colors.surface : colors.textSecondary, fontFamily: typography.fontFamily.body }}>
                        +{restantes} más
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            {/* NUEVO: panel de categorías editable, arriba de "Eventos del día" */}
            <h3 style={estiloSubtituloChico}>Categorías</h3>
            <div style={{ marginBottom: spacing.md }}>
              {categorias.map((cat) => (
                <div key={cat.id} style={estiloFilaCategoria}>
                  <input
                    type="checkbox"
                    checked={categoriasVisibles.has(cat.nombre)}
                    onChange={() => alternarCategoria(cat.nombre)}
                    style={{ accentColor: colors.primary }}
                  />
                  {categoriaEditandoId === cat.id ? (
                    <input
                      autoFocus
                      value={categoriaEditandoNombre}
                      onChange={(e) => setCategoriaEditandoNombre(e.target.value)}
                      onBlur={() => guardarRenombreCategoria(cat.id)}
                      onKeyDown={(e) => e.key === 'Enter' && guardarRenombreCategoria(cat.id)}
                      style={estiloInputInlineCategoria}
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setCategoriaEditandoId(cat.id);
                        setCategoriaEditandoNombre(cat.nombre);
                      }}
                      style={{ flex: 1, cursor: 'text' }}
                      title="Tocar para renombrar"
                    >
                      {cat.nombre}
                    </span>
                  )}
                  <button
                    onClick={() => eliminarCategoria(cat)}
                    style={estiloBotonQuitarCategoria}
                    aria-label={`Eliminar categoría ${cat.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
                <input
                  placeholder="Nueva categoría..."
                  value={nuevaCategoriaNombre}
                  onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                  style={{ ...estiloInputInlineCategoria, flex: 1 }}
                />
                <button onClick={agregarCategoria} style={estiloBotonNav}>+</button>
              </div>
            </div>

            <h3 style={estiloSubtituloChico}>Eventos del día</h3>
            {cargando && <p style={{ color: colors.textSecondary }}>Cargando...</p>}
            {!cargando && eventosDelDia(diaSeleccionado).length === 0 && (
              <p style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.body }}>
                No hay eventos para este día.
              </p>
            )}
            {eventosDelDia(diaSeleccionado).map((evento) => (
              <div
                key={evento.id}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${COLOR_PRIORIDAD[evento.prioridad]}`,
                  borderRadius: 6,
                  padding: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                    {evento.titulo}
                  </div>
                  <span style={estiloBadgeCategoria}>{evento.categoria}</span>
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                  {new Date(evento.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {evento.descripcion && (
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                    {evento.descripcion}
                  </div>
                )}
                {evento.notificacionesActivas && evento.recordatorios.length > 0 && (
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
                     {evento.recordatorios.map((r) => `${r.cantidad} ${UNIDADES.find((u) => u.valor === r.unidad)?.etiqueta}`).join(' · ')}
                  </div>
                )}
                {evento.id < 0 ? (
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
                     Clase recurrente — se edita desde "Horarios de cursado"
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
                    <button onClick={() => abrirModalEditarEvento(evento)} style={estiloBotonNav}>Editar</button>
                    <button onClick={() => eliminarEvento(evento.id)} style={{ ...estiloBotonNav, color: colors.error }}>Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {modalAbierto && (
            <div style={estiloOverlay}>
              <div style={estiloModal}>
                <h3 style={estiloTituloModal}>{editandoId !== null ? 'Editar Evento' : 'Nuevo Evento'}</h3>

                <input
                  placeholder="Ingrese el nombre del nuevo evento..."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  style={estiloInput}
                />
                <textarea
                  placeholder="Ingrese una breve descripción del nuevo evento..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  style={{ ...estiloInput, minHeight: 70, resize: 'vertical' }}
                />

                <label style={estiloEtiquetaCampo}>Categoría</label>
                <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} style={estiloInput}>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>

                {/* NUEVO: selector de hora */}
                <label style={estiloEtiquetaCampo}>Hora</label>
                <input
                  type="time"
                  value={formHora}
                  onChange={(e) => setFormHora(e.target.value)}
                  style={estiloInput}
                />

                <label style={estiloEtiquetaCampo}>Prioridad</label>
                <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
                  {(['leve', 'media', 'importante'] as Prioridad[]).map((p) => {
                    const activa = formPrioridad === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormPrioridad(p)}
                        style={{
                          flex: 1,
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: 999,
                          border: `2px solid ${COLOR_PRIORIDAD[p]}`,
                          background: activa ? COLOR_PRIORIDAD[p] : 'transparent',
                          color: activa ? colors.surface : COLOR_PRIORIDAD[p],
                          fontFamily: typography.fontFamily.body,
                          fontWeight: typography.fontWeight.medium,
                          cursor: 'pointer',
                        }}
                      >
                        {ETIQUETA_PRIORIDAD[p]}
                      </button>
                    );
                  })}
                </div>

                <p style={estiloPreguntaNotif}>¿Desea activar notificaciones para el evento?</p>
                <div style={estiloOpcionesNotif}>
                  <label style={estiloOpcionRadio}>
                    <input type="radio" checked={formNotificacionesActivas} onChange={() => cambiarNotificacionesActivas(true)} /> Sí
                  </label>
                  <label style={estiloOpcionRadio}>
                    <input type="radio" checked={!formNotificacionesActivas} onChange={() => cambiarNotificacionesActivas(false)} /> No
                  </label>
                </div>

                {formNotificacionesActivas && (
                  <div style={{ marginBottom: spacing.sm }}>
                    {formRecordatorios.map((rec, indice) => (
                      <div key={indice} style={estiloFilaRecordatorio}>
                        <span style={estiloEtiquetaRecordatorio}>Notificación</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={rec.cantidad}
                          onChange={(e) => actualizarRecordatorio(indice, { cantidad: Number(e.target.value) || 1 })}
                          style={estiloInputNumeroRecordatorio}
                        />
                        <select
                          value={rec.unidad}
                          onChange={(e) => actualizarRecordatorio(indice, { unidad: e.target.value as UnidadTiempo })}
                          style={estiloSelectUnidadRecordatorio}
                        >
                          {UNIDADES.map((u) => (
                            <option key={u.valor} value={u.valor}>{u.etiqueta}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => eliminarRecordatorio(indice)} style={estiloBotonQuitarRecordatorio} aria-label="Quitar recordatorio">✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={agregarRecordatorio} style={estiloAgregarRecordatorio}>+ Agregar notificación</button>
                  </div>
                )}

                {errorForm && <div style={estiloError}>{errorForm}</div>}

                <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
                  <button onClick={() => setModalAbierto(false)} style={estiloBotonCancelarModal}>Cancelar</button>
                  <button onClick={guardarEvento} style={estiloBotonGuardarModal}>
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

const estiloTextoInstructivo: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.lg,
  fontWeight: typography.fontWeight.medium,
  color: colors.textSecondary,
  marginTop: 0,
  marginBottom: spacing.md,
};

const estiloSubtitulo: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
  fontSize: typography.fontSize.xl,
  color: colors.textPrimary,
  margin: 0,
};

const estiloSubtituloChico: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
  fontSize: typography.fontSize.lg,
  color: colors.textPrimary,
  margin: 0,
  marginBottom: spacing.sm,
};

const estiloCabeceraDiaSemana: React.CSSProperties = {
  textAlign: 'center',
  background: colors.surface,
  padding: spacing.xs,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  color: colors.textSecondary,
  fontWeight: typography.fontWeight.medium,
};

const estiloBotonNav: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  padding: `${spacing.xs} ${spacing.sm}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
};

const estiloBotonPrimario: React.CSSProperties = {
  background: colors.primary,
  color: colors.surface,
  border: 'none',
  borderRadius: 6,
  padding: `${spacing.xs} ${spacing.md}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.medium,
};

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: spacing.sm,
  marginBottom: spacing.sm,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
  boxSizing: 'border-box',
};

const estiloOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const estiloModal: React.CSSProperties = {
  background: colors.primaryLight,
  borderRadius: 10,
  padding: spacing.lg,
  width: 420,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const estiloTituloModal: React.CSSProperties = {
  color: colors.surface,
  fontFamily: typography.fontFamily.display,
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.bold,
  textAlign: 'center',
  margin: 0,
  marginBottom: spacing.md,
};

const estiloEtiquetaCampo: React.CSSProperties = {
  display: 'block',
  color: colors.surface,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  marginBottom: spacing.xs,
};

const estiloPreguntaNotif: React.CSSProperties = {
  color: colors.surface,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.base,
  textAlign: 'center',
  margin: 0,
  marginBottom: spacing.sm,
};

const estiloOpcionesNotif: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: spacing.lg,
  marginBottom: spacing.md,
};

const estiloOpcionRadio: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  color: colors.surface,
  fontFamily: typography.fontFamily.body,
};

const estiloFilaRecordatorio: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.xs,
};

const estiloEtiquetaRecordatorio: React.CSSProperties = {
  flex: 2,
  background: colors.surface,
  borderRadius: 6,
  padding: `${spacing.xs} ${spacing.sm}`,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  color: colors.textPrimary,
};

const estiloInputNumeroRecordatorio: React.CSSProperties = {
  width: 60,
  padding: spacing.xs,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
  textAlign: 'center',
};

const estiloSelectUnidadRecordatorio: React.CSSProperties = {
  flex: 1,
  padding: spacing.xs,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
};

const estiloBotonQuitarRecordatorio: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.surface,
  cursor: 'pointer',
  fontSize: typography.fontSize.base,
  padding: spacing.xs,
};

const estiloAgregarRecordatorio: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.surface,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  padding: 0,
  marginTop: spacing.xs,
};

const estiloBadgeCategoria: React.CSSProperties = {
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
  background: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};

const estiloFilaCategoria: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.xs,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  color: colors.textPrimary,
};

const estiloInputInlineCategoria: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 4,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  boxSizing: 'border-box',
};

const estiloBotonQuitarCategoria: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.textSecondary,
  cursor: 'pointer',
  fontSize: typography.fontSize.sm,
  padding: 0,
};

function estiloPildoraEvento(color: string): React.CSSProperties {
  return {
    background: color,
    color: colors.surface,
    borderRadius: 999,
    padding: '1px 6px',
    fontSize: 10,
    lineHeight: '14px',
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.medium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
  };
}

const estiloError: React.CSSProperties = {
  background: '#FBEAE9',
  border: `1px solid ${colors.error}`,
  borderRadius: 10,
  padding: `${spacing.sm} ${spacing.md}`,
  color: colors.error,
  fontSize: typography.fontSize.sm,
  textAlign: 'center',
  marginBottom: spacing.sm,
};

const estiloBotonCancelarModal: React.CSSProperties = {
  background: colors.surface,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: `${spacing.xs} ${spacing.lg}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.medium,
};

const estiloBotonGuardarModal: React.CSSProperties = {
  background: colors.primary,
  color: colors.surface,
  border: 'none',
  borderRadius: 999,
  padding: `${spacing.xs} ${spacing.lg}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
};