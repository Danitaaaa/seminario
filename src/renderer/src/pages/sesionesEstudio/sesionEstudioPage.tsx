import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, ListTree, PanelRightClose } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { EditorSesion } from '../../components/sesionEstudio/editorSesion';
import { ListaObjetivos } from '../../components/sesionEstudio/listaObjetivos';
import { PanelPomodoro, type ConfiguracionPomodoro } from '../../components/sesionEstudio/panelPomodoro';
import { TarjetaLateral } from '../../components/sesionEstudio/tarjetaLateral';
import { TarjetaProximaSesion } from '../../components/sesionEstudio/tarjetaProximaSesion';
import { ModalConfirmar } from '../../components/sesionEstudio/modalConfirmar';
import { ReproductorSpotify } from '../../components/spotify/reproductorSpotify';
import { usarAvisos } from '../../hooks/usarAvisos';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { FasePomodoro, SesionEstudio } from '../../types/sesionesEstudio';
import { ETIQUETA_FASE, extraerMensajeError, formatearTiempo, segundosEstudiados } from './utilidades';
import { useSesionEnCurso } from './useSesionEnCurso';
import '../../styles/sesionesEstudio.css';

// Pantalla de una sesión: cabecera (tema, materia, estado, Iniciar / Pausar / Reanudar y Finalizar),
// editor con pestañas y panel derecho con Pomodoro, Spotify, Objetivos, Métodos y Próxima sesión.
// El tiempo lo calcula el main; acá solo se muestra el snapshot que llega por el tick.
export function SesionEstudioPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const idSesion = Number(useParams().idSesion);
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [sesion, setSesion] = useState<SesionEstudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarFin, setConfirmarFin] = useState(false);
  const [proxima, setProxima] = useState<SesionEstudio | null>(null);
  const [cargandoProxima, setCargandoProxima] = useState(true);
  const [panelVisible, setPanelVisible] = usarPreferencia('sesion-panel-visible', true);
  const { snapshot, setSnapshot } = useSesionEnCurso(usuarioId);

  // Abre la sesión (actualiza su último acceso en la base).
  const cargar = useCallback(async () => {
    try {
      setSesion(await window.api.abrirSesionEstudio(usuarioId, idSesion));
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo abrir la sesión.'));
    }
  }, [usuarioId, idSesion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setCargandoProxima(true);
    window.api
      .obtenerResumenSesiones({ usuarioId, excluirIdSesion: idSesion })
      .then((r) => setProxima(r.proximaSesion))
      .catch(() => setProxima(null))
      .finally(() => setCargandoProxima(false));
  }, [usuarioId, idSesion]);

  // Ejecuta una acción sobre la sesión: actualiza la pantalla y muestra el cartel de éxito o error.
  async function accion(
    llamada: () => Promise<SesionEstudio>,
    mensajeExito: string | null,
    mensajeError: string
  ): Promise<SesionEstudio | null> {
    setOcupado(true);
    try {
      const actualizada = await llamada();
      setSesion(actualizada);
      if (mensajeExito) avisos.exito(mensajeExito);
      return actualizada;
    } catch (e) {
      avisos.error(extraerMensajeError(e, mensajeError));
      return null;
    } finally {
      setOcupado(false);
    }
  }

  const iniciar = () =>
    accion(() => window.api.iniciarSesionEstudio(usuarioId, idSesion), 'Se inició la sesión. ¡A estudiar!', 'No se pudo iniciar la sesión.');
  const pausar = () =>
    accion(() => window.api.pausarSesionEstudio(usuarioId, idSesion), 'Sesión pausada.', 'No se pudo pausar la sesión.');
  const reanudar = () =>
    accion(() => window.api.reanudarSesionEstudio(usuarioId, idSesion), 'Se reanudó la sesión.', 'No se pudo reanudar la sesión.');

  async function finalizar() {
    setConfirmarFin(false);
    const actualizada = await accion(
      () => window.api.finalizarSesionEstudio(usuarioId, idSesion),
      null,
      'No se pudo finalizar la sesión.'
    );
    if (actualizada) {
      setSnapshot(null);
      const estudiado = segundosEstudiados(actualizada);
      avisos.exito(`Sesión finalizada${estudiado !== null ? `: estudiaste ${formatearTiempo(estudiado)}` : ''}.`);
    }
  }

  // START del Pomodoro: si la sesión todavía no empezó, primero la inicia.
  async function iniciarPomodoro() {
    if (!sesion) return;
    if (sesion.estado === 'sin_empezar' || sesion.estado === 'atrasada') {
      const iniciada = await iniciar();
      if (!iniciada) return;
    }
    await accion(() => window.api.iniciarPomodoro(usuarioId, idSesion), null, 'No se pudo iniciar el Pomodoro.');
  }

  async function guardarConfiguracion(config: ConfiguracionPomodoro) {
    await accion(
      () => window.api.modificarSesionEstudio({ usuarioId, idSesion, ...config }),
      'Se guardaron los tiempos del Pomodoro.',
      'No se pudieron guardar los tiempos.'
    );
  }

  // Tilda o destilda un objetivo y actualiza el estado local.
  async function alternarObjetivo(idObjetivo: number, completado: boolean) {
    try {
      const actualizado = await window.api.actualizarObjetivoSesion({ usuarioId, idObjetivo, completado });
      setSesion((s) => s && { ...s, objetivos: s.objetivos.map((o) => (o.idObjetivo === idObjetivo ? actualizado : o)) });
      if (completado) avisos.exito('¡Objetivo cumplido!');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo actualizar el objetivo.'));
    }
  }

  async function agregarObjetivo(descripcion: string) {
    try {
      const nuevo = await window.api.agregarObjetivoSesion({ usuarioId, idSesion, descripcion });
      setSesion((s) => s && { ...s, objetivos: [...s.objetivos, nuevo] });
      avisos.exito('Se agregó el objetivo.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo agregar el objetivo.'));
    }
  }

  async function eliminarObjetivo(idObjetivo: number) {
    try {
      await window.api.eliminarObjetivoSesion(usuarioId, idObjetivo);
      setSesion((s) => s && { ...s, objetivos: s.objetivos.filter((o) => o.idObjetivo !== idObjetivo) });
      avisos.exito('Se quitó el objetivo.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo eliminar el objetivo.'));
    }
  }

  const enCurso = sesion?.estado === 'en_curso';
  const puedeIniciar = sesion?.estado === 'sin_empezar' || sesion?.estado === 'atrasada';
  const snapshotPropio = snapshot && sesion && snapshot.idSesion === sesion.idSesion ? snapshot : null;

  return (
    <PlantillaLayout titulo="Sesiones de estudio" idActivo="sesiones" usuario={{ nombre: 'Usuario' }}>
      <div className="sesion">
        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} onReintentar={cargar} />}
        {!sesion && !error && <p className="sesiones__vacio">Cargando sesión…</p>}

        {sesion && (
          <>
            <div className="sesion__cabecera">
              <button type="button" className="sesion__volver" aria-label="Volver a la lista" title="Volver" onClick={() => navigate('/sesiones')}>
                <ArrowLeft size={16} />
              </button>
              <span className="sesion__dato">
                <span className="sesion__dato-icono"><FileText size={13} /></span>
                <span className="sesion__dato-etiqueta">Tema:</span> {sesion.nombre}
              </span>
              <span className="sesion__divisor" aria-hidden="true" />
              <span className="sesion__dato">
                <span className="sesion__dato-icono sesion__dato-icono--materia"><BookOpen size={13} /></span>
                <span className="sesion__dato-etiqueta">Materia:</span> {sesion.materiaAsociada.nombre}
              </span>

              <span className="sesion__espacio" />

              <EstadoReloj sesion={sesion} segundos={snapshotPropio?.segundosTranscurridos ?? null} />

              {puedeIniciar && (
                <button type="button" className="sesion__boton" disabled={ocupado} onClick={() => void iniciar()}>
                  Iniciar sesión
                </button>
              )}
              {enCurso && (
                <button
                  type="button"
                  className="sesion__boton"
                  disabled={ocupado}
                  onClick={() => void (sesion.pausada ? reanudar() : pausar())}
                >
                  {sesion.pausada ? 'Reanudar sesión' : 'Pausar sesión'}
                </button>
              )}
              <button
                type="button"
                className="sesion__boton sesion__boton--claro"
                disabled={!enCurso || ocupado}
                onClick={() => setConfirmarFin(true)}
              >
                Finalizar sesión
              </button>
              {panelVisible && (
                <button
                  type="button"
                  className="sesion__icono"
                  aria-label="Ocultar panel lateral"
                  title="Ocultar panel"
                  onClick={() => setPanelVisible(false)}
                >
                  <PanelRightClose size={17} />
                </button>
              )}
            </div>

            {snapshotPropio?.tiempoPlanificadoCumplido && enCurso && (
              <p className="sesion__aviso">Cumpliste los {sesion.duracion} minutos planificados. Podés finalizar la sesión cuando quieras.</p>
            )}

            <div className={`sesion__cuerpo${panelVisible ? '' : ' sesion__cuerpo--sin-panel'}`}>
              <EditorSesion key={sesion.idSesion} usuarioId={usuarioId} idSesion={sesion.idSesion} />

              {panelVisible ? (
                <aside className="sesion__lateral" aria-label="Herramientas de la sesión">
                  <TarjetaLateral titulo="Pomodoro" id="pomodoro">
                    <PanelPomodoro
                      sesion={sesion}
                      snapshot={snapshotPropio}
                      ocupado={ocupado}
                      onIniciar={() => void iniciarPomodoro()}
                      onPausar={() => void accion(() => window.api.pausarPomodoro(usuarioId, idSesion), null, 'No se pudo pausar el Pomodoro.')}
                      onReiniciar={() => void accion(() => window.api.reiniciarPomodoro(usuarioId, idSesion), null, 'No se pudo reiniciar el Pomodoro.')}
                      onCambiarFase={(fase: FasePomodoro) =>
                        void accion(
                          () => window.api.cambiarFasePomodoro({ usuarioId, idSesion, fase }),
                          null,
                          `No se pudo cambiar a ${ETIQUETA_FASE[fase]}.`
                        )
                      }
                      onGuardarConfiguracion={guardarConfiguracion}
                    />
                  </TarjetaLateral>

                  <TarjetaLateral titulo="Spotify" id="spotify">
                    <ReproductorSpotify />
                  </TarjetaLateral>

                  <TarjetaLateral titulo="Objetivos" id="objetivos">
                    <ListaObjetivos
                      titulo="Objetivos de la sesión"
                      objetivos={sesion.objetivos.map((o) => ({ clave: o.idObjetivo, descripcion: o.descripcion, completado: o.completado }))}
                      onAgregar={(d) => void agregarObjetivo(d)}
                      onAlternar={(clave, completado) => void alternarObjetivo(Number(clave), completado)}
                      onEliminar={(clave) => void eliminarObjetivo(Number(clave))}
                    />
                  </TarjetaLateral>

                  <TarjetaLateral titulo="Métodos de estudio" id="metodos">
                    {sesion.metodosEstudio.length === 0 ? (
                      <p className="sesion__nota">Esta sesión no tiene métodos de estudio asignados.</p>
                    ) : (
                      <div className="sesion__metodos">
                        {sesion.metodosEstudio.map((m) => (
                          <span key={m.idTipoMetodoEstudio} className="sesion__metodo">{m.nombre}</span>
                        ))}
                      </div>
                    )}
                  </TarjetaLateral>

                  <TarjetaLateral titulo="Próxima sesión" id="proxima">
                    <TarjetaProximaSesion sesion={proxima} cargando={cargandoProxima} />
                  </TarjetaLateral>
                </aside>
              ) : (
                <button
                  type="button"
                  className="sesion__mostrar-panel"
                  aria-label="Mostrar panel lateral"
                  title="Mostrar Pomodoro, Spotify, objetivos y próxima sesión"
                  onClick={() => setPanelVisible(true)}
                >
                  <ListTree size={18} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmarFin && sesion && (
        <ModalConfirmar
          titulo="Finalizar sesión"
          mensaje={<>¿Querés finalizar <strong>{sesion.nombre}</strong>? Después no se puede volver a iniciar.</>}
          textoConfirmar="Finalizar"
          peligro={false}
          onConfirmar={() => void finalizar()}
          onCancelar={() => setConfirmarFin(false)}
        />
      )}
    </PlantillaLayout>
  );
}

// Punto de estado con el tiempo estudiado: "Sin iniciar", "En curso 12:34", "Pausada 12:34", "Completada · 52:10".
function EstadoReloj({ sesion, segundos }: { sesion: SesionEstudio; segundos: number | null }) {
  let clase = 'sin-iniciar';
  let texto = 'Sin iniciar';
  if (sesion.estado === 'atrasada') {
    clase = 'atrasada';
    texto = 'Atrasada';
  } else if (sesion.estado === 'en_curso') {
    clase = sesion.pausada ? 'pausada' : 'en-curso';
    texto = `${sesion.pausada ? 'Pausada' : 'En curso'}${segundos !== null ? ` · ${formatearTiempo(segundos)}` : ''}`;
  } else if (sesion.estado === 'completada') {
    const estudiado = segundosEstudiados(sesion);
    clase = 'completada';
    texto = `Completada${estudiado !== null ? ` · ${formatearTiempo(estudiado)}` : ''}`;
  }
  return (
    <span className={`sesion__estado sesion__estado--${clase}`} title={`Duración planificada: ${sesion.duracion} min`}>
      <span className="sesion__estado-punto" aria-hidden="true" />
      {texto}
    </span>
  );
}
