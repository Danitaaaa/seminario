import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Boton } from '../comunes/boton';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { formatearTiempo } from '../../pages/sesionesEstudio/utilidades';
import type { SnapshotSesionEnCurso } from '../../types/sesionesEstudio';
import '../../styles/sesionesEstudio.css';

// Práctica activa: una vez iniciada la sesión, no se puede salir hasta cumplir la duración planificada.
// El main decide si la salida está bloqueada (snapshot.salidaBloqueada, cada segundo con el tick) y
// no deja cerrar la ventana ni finalizar la sesión. Acá se bloquea lo del front:
//  - cualquier navegación fuera de la sesión (barra lateral, links, perfil...) vuelve a la sesión;
//  - la barra lateral (incluido "Cerrar sesión") muestra un aviso en lugar de navegar.

export interface BloqueoSesion {
  idSesion: number;
  segundosRestantes: number;
  pausada: boolean;
}

interface ContextoBloqueo {
  bloqueo: BloqueoSesion | null;
  avisarBloqueo: () => void;
}

const Contexto = createContext<ContextoBloqueo>({ bloqueo: null, avisarBloqueo: () => undefined });

export const usarBloqueoSesion = (): ContextoBloqueo => useContext(Contexto);

// Si dejan de llegar ticks (la sesión se finalizó o se dejó de seguir), el bloqueo se levanta.
const MS_SIN_TICK = 5000;

export const mensajeBloqueo = (b: BloqueoSesion) =>
  `Estás en una sesión de Práctica activa: faltan ${formatearTiempo(b.segundosRestantes)} para poder salir.`;

export function ProveedorBloqueoSesion({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [bloqueo, setBloqueo] = useState<BloqueoSesion | null>(null);
  const [cierreBloqueado, setCierreBloqueado] = useState(false);
  const ultimoTick = useRef(0);
  const usuarioConsultado = useRef<number | null>(null);
  const avisosRef = useRef(avisos);
  avisosRef.current = avisos;

  const aplicar = useCallback((snapshot: SnapshotSesionEnCurso | null) => {
    ultimoTick.current = Date.now();
    setBloqueo(
      snapshot?.salidaBloqueada
        ? {
            idSesion: snapshot.idSesion,
            segundosRestantes: Math.max(0, snapshot.segundosPlanificados - snapshot.segundosTranscurridos),
            pausada: snapshot.pausada,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    const quitarTick = window.api.onTickSesionEstudio(aplicar);
    const quitarCierre = window.api.onSalidaBloqueadaSesion((snapshot) => {
      if (snapshot) aplicar(snapshot);
      setCierreBloqueado(true);
    });
    const vigilar = setInterval(() => {
      if (Date.now() - ultimoTick.current > MS_SIN_TICK) setBloqueo(null);
    }, 2000);
    return () => {
      quitarTick();
      quitarCierre();
      clearInterval(vigilar);
    };
  }, [aplicar]);

  // Al iniciar sesión (o al abrir la app ya logueado) se le pide al main la sesión en curso:
  // así la retoma y empieza a mandar el tick aunque el usuario no entre a la pantalla de la sesión.
  useEffect(() => {
    const usuarioId = obtenerUsuarioId();
    if (usuarioId === null) {
      usuarioConsultado.current = null;
      return;
    }
    if (usuarioConsultado.current === usuarioId) return;
    usuarioConsultado.current = usuarioId;
    window.api
      .obtenerSesionEnCurso(usuarioId)
      .then((actual) => aplicar(actual.snapshot))
      .catch(() => undefined);
  }, [pathname, aplicar]);

  // Cualquier navegación fuera de la sesión bloqueada vuelve a ella.
  useEffect(() => {
    if (!bloqueo) return;
    const rutaSesion = `/sesiones/${bloqueo.idSesion}`;
    if (pathname !== rutaSesion) {
      navigate(rutaSesion, { replace: true });
      avisosRef.current.info(mensajeBloqueo(bloqueo));
    }
    // Solo cuando cambia la ruta o empieza el bloqueo, no con cada segundo del tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, bloqueo?.idSesion, navigate]);

  const avisarBloqueo = useCallback(() => {
    if (bloqueo) avisosRef.current.info(mensajeBloqueo(bloqueo));
  }, [bloqueo]);

  return (
    <Contexto.Provider value={{ bloqueo, avisarBloqueo }}>
      {children}
      {cierreBloqueado && (
        <ModalCierreBloqueado bloqueo={bloqueo} onCerrar={() => setCierreBloqueado(false)} />
      )}
    </Contexto.Provider>
  );
}

// Se intentó cerrar la app durante la sesión: el main no la cerró y avisa por qué.
function ModalCierreBloqueado({ bloqueo, onCerrar }: { bloqueo: BloqueoSesion | null; onCerrar: () => void }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="sesiones__overlay" onClick={onCerrar}>
      <div
        className="sesiones__modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="Todavía no podés cerrar la app"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="practica-activa__icono" aria-hidden="true"><Lock size={22} /></span>
        <h3 className="sesiones__modal-titulo">Todavía no podés cerrar la app</h3>
        <p className="sesiones__modal-texto">
          Estás en una sesión de <strong>Práctica activa</strong>.
          {bloqueo ? <> Faltan <strong>{formatearTiempo(bloqueo.segundosRestantes)}</strong> para completar el tiempo planificado.</> : null}{' '}
          Cuando se cumpla vas a poder finalizar la sesión y cerrar la app.
        </p>
        {bloqueo?.pausada && (
          <p className="sesiones__modal-texto">La sesión está pausada: el tiempo no avanza hasta que la reanudes.</p>
        )}
        <div className="sesiones__modal-acciones">
          <Boton onClick={onCerrar} autoFocus>Seguir estudiando</Boton>
        </div>
      </div>
    </div>
  );
}
