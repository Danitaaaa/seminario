import { useEffect, useMemo, useState } from 'react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import {
  HorarioCursado,
  CrearHorarioInput,
  ModificarHorarioInput,
  NOMBRES_DIA_SEMANA,
} from '../../types/horarios';
import { obtenerUsuarioId } from '../../../lib/sesion';
import '../../styles/horarios.css';
 
const ALTO_HORA = 56; // px por hora en la grilla
const DIAS_BASE = [1, 2, 3, 4, 5]; // lunes a viernes
const DIAS_FORMULARIO = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo
const TONOS = ['frost', 'salvia', 'ambar', 'rosa', 'acero'] as const;
 
type Vista = 'semanal' | 'materia';
 
// Electron envuelve el error real como "Error invoking remote method '...':
// Error: <mensaje nuestro>". Esto rescata el mensaje de negocio.
function extraerMensajeError(err: unknown, generico: string): string {
  const texto = err instanceof Error ? err.message : String(err);
  const partes = texto.split('Error: ');
  return partes.length > 1 ? partes[partes.length - 1] : generico;
}
 
const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};
 
const aHora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
 
// Misma materia -> mismo color, siempre.
function tonoDe(titulo: string): string {
  let hash = 0;
  for (const c of titulo.toLowerCase()) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[hash % TONOS.length];
}
 
export function HorariosPage(): JSX.Element {
  const USUARIO_ID_ACTUAL = obtenerUsuarioId() ?? 0;
  const [, setBusqueda] = useState('');
 
  const [vista, setVista] = useState<Vista>('semanal');
  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [cargando, setCargando] = useState(false);
 
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formDias, setFormDias] = useState<number[]>([1]);
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('09:00');
  const [formTitulo, setFormTitulo] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
 
  useEffect(() => {
    cargarHorarios();
  }, []);
 
  async function cargarHorarios(): Promise<void> {
    setCargando(true);
    try {
      const resultado = await window.api.listarHorarios({ usuarioId: USUARIO_ID_ACTUAL });
      setHorarios(resultado);
    } finally {
      setCargando(false);
    }
  }
 
  function abrirModalNuevo(dia = 1, horaInicio = '08:00'): void {
    setEditandoId(null);
    setFormDias([dia]);
    setFormHoraInicio(horaInicio);
    setFormHoraFin(aHora(Math.min(aMinutos(horaInicio) + 60, 23 * 60 + 59)));
    setFormTitulo('');
    setErrorForm(null);
    setModalAbierto(true);
  }
 
  function abrirModalEditar(horario: HorarioCursado): void {
    setEditandoId(horario.id);
    setFormDias([horario.diaSemana]);
    setFormHoraInicio(horario.horaInicio);
    setFormHoraFin(horario.horaFin);
    setFormTitulo(horario.titulo);
    setErrorForm(null);
    setModalAbierto(true);
  }
 
  // Al crear se pueden marcar varios días; al editar, cada bloque tiene un solo día.
  function alternarDia(dia: number): void {
    if (editandoId !== null) {
      setFormDias([dia]);
      return;
    }
    setFormDias((actuales) =>
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia]
    );
  }

  async function guardarHorario(): Promise<void> {
    if (!formTitulo.trim()) {
      setErrorForm('El nombre de la materia es obligatorio.');
      return;
    }
    if (formDias.length === 0) {
      setErrorForm('Elegí al menos un día.');
      return;
    }
    if (formHoraFin <= formHoraInicio) {
      setErrorForm('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
 
    try {
      setErrorForm(null);
      if (editandoId !== null) {
        const cambios: ModificarHorarioInput = {
          id: editandoId,
          diaSemana: formDias[0],
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          titulo: formTitulo.trim(),
        };
        await window.api.modificarHorario(cambios);
      } else {
        // Un bloque por cada día marcado, con la misma materia y el mismo horario.
        for (const dia of formDias) {
          const nuevo: CrearHorarioInput = {
            usuarioId: USUARIO_ID_ACTUAL,
            diaSemana: dia,
            horaInicio: formHoraInicio,
            horaFin: formHoraFin,
            titulo: formTitulo.trim(),
          };
          await window.api.crearHorario(nuevo);
        }
      }
      setModalAbierto(false);
      await cargarHorarios();
    } catch (err) {
      console.error('Error al guardar horario:', err);
      setErrorForm(
        extraerMensajeError(err, 'No se pudo guardar el horario. Revisá la consola para más detalles.')
      );
      // Si falló a mitad de camino, se muestran los días que sí se guardaron.
      await cargarHorarios();
    }
  }
 
  async function eliminarHorario(): Promise<void> {
    if (editandoId === null) return;
    await window.api.eliminarHorario({ id: editandoId });
    setModalAbierto(false);
    await cargarHorarios();
  }
 
  // Sábado y domingo solo aparecen si hay clases esos días.
  const dias = useMemo(() => {
    const extra = [6, 0].filter((d) => horarios.some((h) => h.diaSemana === d));
    return [...DIAS_BASE, ...extra];
  }, [horarios]);
 
  // Rango de horas: 08 a 20 como mínimo, se estira si hay clases fuera.
  const [horaDesde, horaHasta] = useMemo(() => {
    let desde = 8;
    let hasta = 20;
    for (const h of horarios) {
      desde = Math.min(desde, Math.floor(aMinutos(h.horaInicio) / 60));
      hasta = Math.max(hasta, Math.ceil(aMinutos(h.horaFin) / 60));
    }
    return [desde, hasta];
  }, [horarios]);
 
  const horas = Array.from({ length: horaHasta - horaDesde }, (_, i) => horaDesde + i);
 
  const proximas = useMemo(() => {
    const ahora = new Date();
    const minutoSemanaActual = ahora.getDay() * 1440 + ahora.getHours() * 60 + ahora.getMinutes();
    return [...horarios]
      .map((h) => {
        const inicio = h.diaSemana * 1440 + aMinutos(h.horaInicio);
        const faltan = (inicio - minutoSemanaActual + 7 * 1440) % (7 * 1440);
        return { h, faltan };
      })
      .sort((a, b) => a.faltan - b.faltan)
      .slice(0, 3)
      .map(({ h }) => h);
  }, [horarios]);
 
  const porMateria = useMemo(() => {
    const grupos = new Map<string, HorarioCursado[]>();
    for (const h of horarios) {
      const lista = grupos.get(h.titulo) ?? [];
      lista.push(h);
      grupos.set(h.titulo, lista);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([titulo, lista]) => ({
        titulo,
        lista: lista.sort(
          (a, b) => ((a.diaSemana + 6) % 7) - ((b.diaSemana + 6) % 7) || a.horaInicio.localeCompare(b.horaInicio)
        ),
      }));
  }, [horarios]);
 
  const totalHoras =
    horarios.reduce((acc, h) => acc + aMinutos(h.horaFin) - aMinutos(h.horaInicio), 0) / 60;
 
  return (
    <PlantillaLayout
      titulo="Horarios"
      idActivo="horarios"
      usuario={{ nombre: 'Usuario' }}
      onBuscar={setBusqueda}
    >
      <div className="horarios">
        <header className="horarios__cabecera">
          <p className="horarios__subtitulo">Visualizá y organizá tus clases de la facultad</p>
          <button className="horarios__boton-primario" onClick={() => abrirModalNuevo()}>
            + Agregar horario
          </button>
        </header>
 
        <div className="horarios__pestanas">
          <button
            className={`horarios__pestana ${vista === 'semanal' ? 'horarios__pestana--activa' : ''}`}
            onClick={() => setVista('semanal')}
          >
            Vista semanal
          </button>
          <button
            className={`horarios__pestana ${vista === 'materia' ? 'horarios__pestana--activa' : ''}`}
            onClick={() => setVista('materia')}
          >
            Vista por materia
          </button>
        </div>
 
        <div className="horarios__cuerpo">
          {vista === 'semanal' ? (
            <div
              className="horarios__grilla"
              style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(0, 1fr))` }}
            >
              <div className="horarios__esquina" />
              {dias.map((d) => (
                <div key={d} className="horarios__dia">{NOMBRES_DIA_SEMANA[d]}</div>
              ))}
 
              <div className="horarios__horas" style={{ height: horas.length * ALTO_HORA }}>
                {horas.map((h) => (
                  <span key={h} style={{ top: (h - horaDesde) * ALTO_HORA }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
 
              {dias.map((d) => (
                <div
                  key={d}
                  className="horarios__columna"
                  style={{ height: horas.length * ALTO_HORA, backgroundSize: `100% ${ALTO_HORA}px` }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const y = e.nativeEvent.offsetY;
                    abrirModalNuevo(d, aHora((horaDesde + Math.floor(y / ALTO_HORA)) * 60));
                  }}
                >
                  {horarios
                    .filter((h) => h.diaSemana === d)
                    .map((h) => {
                      const inicio = aMinutos(h.horaInicio) - horaDesde * 60;
                      const duracion = aMinutos(h.horaFin) - aMinutos(h.horaInicio);
                      return (
                        <button
                          key={h.id}
                          className={`horarios__bloque horarios__bloque--${tonoDe(h.titulo)}`}
                          style={{
                            top: (inicio / 60) * ALTO_HORA + 2,
                            height: (duracion / 60) * ALTO_HORA - 4,
                          }}
                          onClick={() => abrirModalEditar(h)}
                        >
                          <span className="horarios__bloque-titulo">{h.titulo}</span>
                          <span className="horarios__bloque-hora">
                            {h.horaInicio} – {h.horaFin}
                          </span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : (
            <div className="horarios__materias">
              {porMateria.length === 0 && !cargando && (
                <p className="horarios__vacio">Todavía no cargaste horarios.</p>
              )}
              {porMateria.map(({ titulo, lista }) => (
                <div key={titulo} className={`horarios__materia horarios__bloque--${tonoDe(titulo)}`}>
                  <h3 className="horarios__materia-titulo">{titulo}</h3>
                  {lista.map((h) => (
                    <button key={h.id} className="horarios__materia-fila" onClick={() => abrirModalEditar(h)}>
                      <span>{NOMBRES_DIA_SEMANA[h.diaSemana]}</span>
                      <span>{h.horaInicio} – {h.horaFin}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
 
          <aside className="horarios__lateral">
            <h3 className="horarios__lateral-titulo">Próximas clases</h3>
            {proximas.length === 0 && <p className="horarios__vacio">Sin clases cargadas.</p>}
            {proximas.map((h) => (
              <button
                key={h.id}
                className={`horarios__proxima horarios__bloque--${tonoDe(h.titulo)}`}
                onClick={() => abrirModalEditar(h)}
              >
                <span className="horarios__proxima-titulo">{h.titulo}</span>
                <span className="horarios__proxima-detalle">
                  {NOMBRES_DIA_SEMANA[h.diaSemana]} · {h.horaInicio} – {h.horaFin}
                </span>
              </button>
            ))}
          </aside>
        </div>
 
        <footer className="horarios__resumen">
          {cargando
            ? 'Cargando...'
            : `Esta semana tenés ${porMateria.length} ${porMateria.length === 1 ? 'materia' : 'materias'} y ${
                Number.isInteger(totalHoras) ? totalHoras : totalHoras.toFixed(1)
              } horas de clases.`}
        </footer>
 
        {modalAbierto && (
          <div className="horarios__overlay" onClick={() => setModalAbierto(false)}>
            <div className="horarios__modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="horarios__modal-titulo">
                {editandoId !== null ? 'Editar horario' : 'Nuevo horario'}
              </h3>
 
              <label className="horarios__campo">
                Materia
                <input
                  placeholder="Ej.: Base de Datos"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                />
              </label>
 
              <div className="horarios__campo">
                {editandoId !== null ? 'Día' : 'Días'}
                <div
                  className="horarios__dias"
                  role={editandoId !== null ? 'radiogroup' : 'group'}
                  aria-label={editandoId !== null ? 'Día' : 'Días'}
                >
                  {DIAS_FORMULARIO.map((d) => {
                    const activo = formDias.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        role={editandoId !== null ? 'radio' : 'checkbox'}
                        aria-checked={activo}
                        aria-label={NOMBRES_DIA_SEMANA[d]}
                        className={`horarios__dia-opcion${activo ? ' horarios__dia-opcion--activa' : ''}`}
                        onClick={() => alternarDia(d)}
                      >
                        {NOMBRES_DIA_SEMANA[d].slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </div>
 
              <div className="horarios__fila-campos">
                <label className="horarios__campo">
                  Desde
                  <input type="time" value={formHoraInicio} onChange={(e) => setFormHoraInicio(e.target.value)} />
                </label>
                <label className="horarios__campo">
                  Hasta
                  <input type="time" value={formHoraFin} onChange={(e) => setFormHoraFin(e.target.value)} />
                </label>
              </div>
 
              {errorForm && <div className="horarios__error">{errorForm}</div>}
 
              <div className="horarios__modal-acciones">
                {editandoId !== null && (
                  <button className="horarios__boton-peligro" onClick={eliminarHorario}>
                    Eliminar
                  </button>
                )}
                <button className="horarios__boton-secundario" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button className="horarios__boton-primario" onClick={guardarHorario}>
                  {editandoId !== null ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlantillaLayout>
  );
}