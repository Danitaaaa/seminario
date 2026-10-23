import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { EstadoBadge } from '../../components/sesionEstudio/estadoBadge';
import { EditorSesion } from '../../components/sesionEstudio/editorSesion';
import { ListaObjetivos } from '../../components/sesionEstudio/listaObjetivos';
import { PanelPomodoro } from '../../components/sesionEstudio/panelPomodoro';
import { formatearFecha } from '../../utils/formatearFecha';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import { extraerMensajeError, formatearTiempo } from './utilidades';
import { useSesionEnCurso } from './useSesionEnCurso';
import '../../styles/sesionesEstudio.css';

// Pantalla de una sesión: cabecera con Iniciar/Finalizar, editor, Pomodoro y objetivos.
// El tiempo lo calcula el main; acá solo se muestra el snapshot que llega por el tick.
export function SesionEstudioPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const idSesion = Number(useParams().idSesion);
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionEstudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinGuardar, setSinGuardar] = useState(false);
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

  // Inicia la sesión; el main empieza a seguirla y a emitir el tick.
  async function iniciar() {
    try {
      const actualizada = await window.api.iniciarSesionEstudio(usuarioId, idSesion);
      setSesion((s) => (s ? { ...actualizada, contenido: s.contenido } : actualizada));
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo iniciar la sesión.'));
    }
  }

  // Finaliza la sesión y deja de mostrar el timer.
  async function finalizar() {
    try {
      const actualizada = await window.api.finalizarSesionEstudio(usuarioId, idSesion);
      setSesion((s) => (s ? { ...actualizada, contenido: s.contenido } : actualizada));
      setSnapshot(null);
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo finalizar la sesión.'));
    }
  }

  // Guarda el editor en la sesión y en el Word de Material.
  async function guardarContenido(html: string) {
    try {
      await window.api.guardarContenidoSesionEstudio({ usuarioId, idSesion, contenido: html });
      setAviso('Cambios guardados en la sesión y en Material.');
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo guardar el contenido.'));
      throw e;
    }
  }

  // Vuelve a la lista, pidiendo confirmación si hay cambios sin guardar.
  function volver() {
    if (sinGuardar && !window.confirm('Hay cambios sin guardar. ¿Salir igual?')) return;
    navigate('/sesiones');
  }

  // Tilda o destilda un objetivo y actualiza el estado local.
  async function alternarObjetivo(idObjetivo: number, completado: boolean) {
    try {
      const actualizado = await window.api.actualizarObjetivoSesion({ usuarioId, idObjetivo, completado });
      setSesion((s) => s && { ...s, objetivos: s.objetivos.map((o) => (o.idObjetivo === idObjetivo ? actualizado : o)) });
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo actualizar el objetivo.'));
    }
  }

  // Agrega un objetivo nuevo a la sesión.
  async function agregarObjetivo(descripcion: string) {
    try {
      const nuevo = await window.api.agregarObjetivoSesion({ usuarioId, idSesion, descripcion });
      setSesion((s) => s && { ...s, objetivos: [...s.objetivos, nuevo] });
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo agregar el objetivo.'));
    }
  }

  // Elimina un objetivo de la sesión.
  async function eliminarObjetivo(idObjetivo: number) {
    try {
      await window.api.eliminarObjetivoSesion(usuarioId, idObjetivo);
      setSesion((s) => s && { ...s, objetivos: s.objetivos.filter((o) => o.idObjetivo !== idObjetivo) });
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo eliminar el objetivo.'));
    }
  }

  const titulo = sesion ? sesion.nombre : 'Sesión de estudio';
  const puedeIniciar = sesion?.estado === 'sin_empezar' || sesion?.estado === 'atrasada';
  const enCurso = sesion?.estado === 'en_curso';
  const tiempoReal =
    sesion?.fechaInicio && sesion.fechaFin
      ? (new Date(sesion.fechaFin).getTime() - new Date(sesion.fechaInicio).getTime()) / 1000
      : null;

  return (
    <PlantillaLayout titulo={titulo} idActivo="sesiones" usuario={{ nombre: 'Usuario' }}>
      <div className="sesiones">
        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}
        {!sesion && !error && <p className="sesiones__vacio">Cargando sesión…</p>}

        {sesion && (
          <>
            <div className="sesiones__cabecera">
              <Boton variante="contorno" onClick={volver}>← Volver</Boton>
              <span className="sesiones__sub">Materia: {sesion.materiaAsociada.nombre}</span>
              <EstadoBadge estado={sesion.estado} />
              <span className="sesiones__cabecera-espacio" />
              <Boton disabled={!puedeIniciar} onClick={() => void iniciar()}>Iniciar sesión</Boton>
              <Boton variante="contorno" disabled={!enCurso} onClick={() => void finalizar()}>Finalizar sesión</Boton>
            </div>

            <div className="sesiones__cuerpo">
              <div>
                <EditorSesion
                  key={sesion.idSesion}
                  contenidoInicial={sesion.contenido}
                  onGuardar={guardarContenido}
                  onModificadoChange={setSinGuardar}
                />
                <p className="sesiones__nota">
                  {aviso ?? 'Se guarda en la sesión y como Word en Material › Sesiones de estudio.'}
                </p>
              </div>

              <aside className="sesiones__lateral">
                <PanelPomodoro sesion={sesion} snapshot={snapshot} />

                <section>
                  <h4 className="sesiones__tarjeta-titulo">Objetivos</h4>
                  <ListaObjetivos
                    objetivos={sesion.objetivos.map((o) => ({
                      clave: o.idObjetivo,
                      descripcion: o.descripcion,
                      completado: o.completado,
                    }))}
                    onAgregar={(d) => void agregarObjetivo(d)}
                    onAlternar={(clave, completado) => void alternarObjetivo(Number(clave), completado)}
                    onEliminar={(clave) => void eliminarObjetivo(Number(clave))}
                  />
                </section>

                <section className="sesiones__sub">
                  <div>Programada: {formatearFecha(sesion.fechaProgramada)}</div>
                  <div>Duración planificada: {sesion.duracion} min</div>
                  {tiempoReal !== null && <div>Tiempo estudiado: {formatearTiempo(tiempoReal)}</div>}
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </PlantillaLayout>
  );
}
