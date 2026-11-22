import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import {
  HorarioCursado,
  CrearHorarioInput,
  ModificarHorarioInput,
  NOMBRES_DIA_SEMANA,
} from '../../types/horarios';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { TONOS, claseTono, tonoDeMateria } from '../../utils/tonos';
import type { CuatrimestreCursada, OpcionMateria } from '../../types/materias';
import { cuatrimestreActual, estadoCuatrimestre, rangoCuatrimestre } from '../../utils/cuatrimestres';
import '../../styles/horarios.css';
 
const ALTO_HORA = 56; // px por hora en la grilla
const DIAS_BASE = [1, 2, 3, 4, 5]; // lunes a viernes
const DIAS_FORMULARIO = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo
 
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
 
 
export function HorariosPage(): JSX.Element {
  const USUARIO_ID_ACTUAL = obtenerUsuarioId() ?? 0;
  const [, setBusqueda] = useState('');
 
  // La vista elegida (semanal o por materia) queda guardada al salir de la pantalla.
  const [vista, setVista] = usarPreferencia<Vista>(`horarios:vista:${obtenerUsuarioId() ?? 0}`, 'semanal');
  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // Cuatrimestre que se está mirando (queda guardado). Si no hay ninguno elegido, el actual.
  const [cuatris, setCuatris] = useState<CuatrimestreCursada[] | null>(null);
  const [idCuatri, setIdCuatri] = usarPreferencia<number | null>(`horarios:cuatrimestre:${USUARIO_ID_ACTUAL}`, null);
  const cuatri = cuatris?.find((c) => c.idCuatrimestre === idCuatri) ?? null;
  // Materias para elegir en "Nuevo horario" (las que están en curso primero).
  const [materias, setMaterias] = useState<OpcionMateria[]>([]);
  const [formIdMateria, setFormIdMateria] = useState<number | null>(null);
 
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formDias, setFormDias] = useState<number[]>([1]);
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('09:00');
  const [formTitulo, setFormTitulo] = useState('');
  const [formTono, setFormTono] = useState<number | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  // Si se marcan varios días, cada uno puede tener su propio horario.
  const [mismoHorario, setMismoHorario] = useState(true);
  const [horasPorDia, setHorasPorDia] = useState<Record<number, { inicio: string; fin: string }>>({});
 
  useEffect(() => {
    window.api.listarCuatrimestres({ usuarioId: USUARIO_ID_ACTUAL })
      .then((lista) => {
        setCuatris(lista);
        if (!lista.some((c) => c.idCuatrimestre === idCuatri)) setIdCuatri(cuatrimestreActual(lista)?.idCuatrimestre ?? null);
      })
      .catch((e) => console.error('Error al cargar cuatrimestres:', e));
    window.api.listarMateriasUsuario({ usuarioId: USUARIO_ID_ACTUAL })
      .then(setMaterias)
      .catch((e) => console.error('Error al cargar materias:', e));
  }, []);

  useEffect(() => {
    if (cuatris) cargarHorarios();
  }, [cuatris, idCuatri]);
 
  async function cargarHorarios(): Promise<void> {
    setCargando(true);
    try {
      const resultado = await window.api.listarHorarios({ usuarioId: USUARIO_ID_ACTUAL, idCuatrimestre: idCuatri ?? undefined });
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
    setFormIdMateria(null);
    setFormTono(null);
    setErrorForm(null);
    setMismoHorario(true);
    setHorasPorDia({});
    setModalAbierto(true);
  }
 
  function abrirModalEditar(horario: HorarioCursado): void {
    setEditandoId(horario.id);
    setFormDias([horario.diaSemana]);
    setFormHoraInicio(horario.horaInicio);
    setFormHoraFin(horario.horaFin);
    setFormTitulo(horario.titulo);
    setFormIdMateria(horario.idMateria);
    setFormTono(tonoDeMateria(horario.titulo, horarios));
    setErrorForm(null);
    setMismoHorario(true);
    setHorasPorDia({});
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

  const usaHorarioPorDia = editandoId === null && formDias.length > 1 && !mismoHorario;
  const diasOrdenados = DIAS_FORMULARIO.filter((d) => formDias.includes(d));

  const horaDe = (dia: number) =>
    usaHorarioPorDia
      ? horasPorDia[dia] ?? { inicio: formHoraInicio, fin: formHoraFin }
      : { inicio: formHoraInicio, fin: formHoraFin };

  function cambiarHoraDia(dia: number, campo: 'inicio' | 'fin', valor: string): void {
    setHorasPorDia((actuales) => ({
      ...actuales,
      [dia]: { ...(actuales[dia] ?? { inicio: formHoraInicio, fin: formHoraFin }), [campo]: valor },
    }));
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
    const diaInvalido = diasOrdenados.find((d) => horaDe(d).fin <= horaDe(d).inicio);
    if (diaInvalido !== undefined) {
      setErrorForm(
        usaHorarioPorDia
          ? `El ${NOMBRES_DIA_SEMANA[diaInvalido].toLowerCase()}, la hora de fin debe ser posterior a la de inicio.`
          : 'La hora de fin debe ser posterior a la hora de inicio.'
      );
      return;
    }
 
    // Si no se tocó el selector, se mantiene el tono que ya tenía la materia.
    const tonoElegido = formTono ?? tonoDeMateria(formTitulo.trim(), horarios);

    try {
      setErrorForm(null);
      if (editandoId !== null) {
        const cambios: ModificarHorarioInput = {
          id: editandoId,
          diaSemana: formDias[0],
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          titulo: formTitulo.trim(),
          tono: tonoElegido,
          idMateria: formIdMateria,
        };
        await window.api.modificarHorario(cambios);
      } else {
        // Un bloque por cada día marcado, con la misma materia y el mismo horario.
        for (const dia of diasOrdenados) {
          const { inicio, fin } = horaDe(dia);
          const nuevo: CrearHorarioInput = {
            usuarioId: USUARIO_ID_ACTUAL,
            diaSemana: dia,
            horaInicio: inicio,
            horaFin: fin,
            titulo: formTitulo.trim(),
            tono: tonoElegido,
            idCuatrimestre: idCuatri,
            idMateria: formIdMateria,
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
 
  // Horarios cargados antes de que existieran los cuatrimestres: no van a Google hasta asignarlos.
  const sinCuatrimestre = horarios.filter((h) => h.idCuatrimestre === null).length;

  async function asignarSinCuatrimestre(): Promise<void> {
    if (idCuatri === null) return;
    await window.api.asignarCuatrimestreHorarios({ usuarioId: USUARIO_ID_ACTUAL, idCuatrimestre: idCuatri });
    await cargarHorarios();
  }

  const enCurso = materias.filter((m) => m.estado === 'cursando');
  const otrasMaterias = materias.filter((m) => m.estado !== 'cursando');

  function elegirMateria(valor: string): void {
    const materia = materias.find((m) => m.idMateria === Number(valor));
    setFormIdMateria(materia?.idMateria ?? null);
    if (materia) setFormTitulo(materia.nombre);
  }

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
          <div className="horarios__periodo">
            {cuatris && cuatris.length > 0 ? (
              <>
                <select
                  className="horarios__periodo-select"
                  aria-label="Cuatrimestre"
                  value={idCuatri ?? ''}
                  onChange={(e) => setIdCuatri(Number(e.target.value))}
                >
                  {cuatris.map((c) => (
                    <option key={c.idCuatrimestre} value={c.idCuatrimestre}>{c.nombre}</option>
                  ))}
                </select>
                {cuatri && (
                  <span className="horarios__subtitulo">
                    {rangoCuatrimestre(cuatri)} · {estadoCuatrimestre(cuatri)}
                  </span>
                )}
                <button
                  type="button"
                  className="horarios__icono"
                  aria-label="Editar fechas del cuatrimestre"
                  title="Fechas, feriados y recesos"
                  onClick={() => navigate(`/materias?cuatrimestres=${idCuatri ?? ''}`)}
                >
                  <Settings size={16} />
                </button>
              </>
            ) : (
              <p className="horarios__subtitulo">Visualizá y organizá tus clases de la facultad</p>
            )}
          </div>
          <button className="horarios__boton-primario" onClick={() => abrirModalNuevo()}>
            + Agregar horario
          </button>
        </header>
 
        {cuatris && cuatris.length === 0 && (
          <div className="horarios__aviso">
            <span>Cargá las fechas de tu cuatrimestre para que las clases se copien a Google Calendar solo hasta que termine la cursada.</span>
            <button className="horarios__boton-secundario" onClick={() => navigate('/materias?cuatrimestres=')}>
              Cargar cuatrimestre
            </button>
          </div>
        )}

        {cuatri && sinCuatrimestre > 0 && (
          <div className="horarios__aviso">
            <span>
              {sinCuatrimestre === 1 ? 'Tenés 1 horario' : `Tenés ${sinCuatrimestre} horarios`} sin cuatrimestre. No se copian a Google Calendar hasta que los asignes.
            </span>
            <button className="horarios__boton-secundario" onClick={() => void asignarSinCuatrimestre()}>
              Pasarlos al {cuatri.nombre}
            </button>
          </div>
        )}

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
                          className={`horarios__bloque ${claseTono(tonoDeMateria(h.titulo, horarios))}`}
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
                <div key={titulo} className={`horarios__materia ${claseTono(tonoDeMateria(titulo, horarios))}`}>
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
                className={`horarios__proxima ${claseTono(tonoDeMateria(h.titulo, horarios))}`}
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
 
              {materias.length > 0 && (
                <label className="horarios__campo">
                  Materia
                  <select value={formIdMateria ?? ''} onChange={(e) => elegirMateria(e.target.value)}>
                    <option value="">Otra (la escribo)</option>
                    {enCurso.length > 0 && (
                      <optgroup label="Cursando">
                        {enCurso.map((m) => <option key={m.idMateria} value={m.idMateria}>{m.nombre} · {m.formacion}</option>)}
                      </optgroup>
                    )}
                    {otrasMaterias.length > 0 && (
                      <optgroup label="Otras materias">
                        {otrasMaterias.map((m) => <option key={m.idMateria} value={m.idMateria}>{m.nombre} · {m.formacion}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
              )}

              <label className="horarios__campo">
                {materias.length > 0 ? 'Nombre en el horario' : 'Materia'}
                <input
                  placeholder="Ej.: Base de Datos"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                />
              </label>
 
              <div className="horarios__campo">
                Color
                <div className="tono-selector" role="radiogroup" aria-label="Color de la materia">
                  {TONOS.map((t) => {
                    const activo = (formTono ?? tonoDeMateria(formTitulo.trim(), horarios)) === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        aria-label={t.nombre}
                        title={t.nombre}
                        className={`tono-opcion ${claseTono(t.id)}${activo ? ' tono-opcion--activa' : ''}`}
                        onClick={() => setFormTono(t.id)}
                      />
                    );
                  })}
                </div>
              </div>

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
 
              {editandoId === null && formDias.length > 1 && (
                <label className="horarios__check">
                  <input
                    type="checkbox"
                    checked={mismoHorario}
                    onChange={(e) => setMismoHorario(e.target.checked)}
                  />
                  Mismo horario todos los días
                </label>
              )}

              {usaHorarioPorDia ? (
                <div className="horarios__horas-dia">
                  {diasOrdenados.map((d) => (
                    <div key={d} className="horarios__fila-dia">
                      <span className="horarios__fila-dia-nombre">{NOMBRES_DIA_SEMANA[d]}</span>
                      <input
                        type="time"
                        aria-label={`Desde, ${NOMBRES_DIA_SEMANA[d]}`}
                        value={horaDe(d).inicio}
                        onChange={(e) => cambiarHoraDia(d, 'inicio', e.target.value)}
                      />
                      <span aria-hidden="true">a</span>
                      <input
                        type="time"
                        aria-label={`Hasta, ${NOMBRES_DIA_SEMANA[d]}`}
                        value={horaDe(d).fin}
                        onChange={(e) => cambiarHoraDia(d, 'fin', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
 
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