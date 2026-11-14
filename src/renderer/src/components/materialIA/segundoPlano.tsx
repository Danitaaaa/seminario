// Generación con IA en segundo plano: mientras la IA trabaja se puede seguir usando la app.
// - ProveedorSegundoPlano (en app.tsx) mantiene abiertos los modales de IA aunque se cambie de pantalla.
// - VentanaIA envuelve cada modal: mientras genera lo muestra como un cartel chico al costado
//   (con la animación de siempre) y, cuando termina, el cartel avisa "¡Listo!" y abre el resultado.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { IndicadorIA } from './indicadorIA';
import { hablar } from '../../voz/narrador';
import '../../styles/segundoPlano.css';

type Render = (cerrar: () => void) => ReactNode;

interface ContextoSegundoPlano {
  // Abre un modal de IA que sigue vivo aunque se cambie de pantalla. Con la misma clave no se abre dos veces.
  abrir: (clave: string, render: Render) => void;
  pila: HTMLElement | null; // donde se apilan los carteles del costado
}

const Contexto = createContext<ContextoSegundoPlano | null>(null);

export function ProveedorSegundoPlano({ children }: { children: ReactNode }) {
  const [abiertos, setAbiertos] = useState<{ clave: string; render: Render }[]>([]);
  const [pila, setPila] = useState<HTMLElement | null>(null);

  const abrir = useCallback((clave: string, render: Render) => {
    setAbiertos((lista) => (lista.some((a) => a.clave === clave) ? lista : [...lista, { clave, render }]));
  }, []);

  return (
    <Contexto.Provider value={{ abrir, pila }}>
      {children}
      {abiertos.map(({ clave, render }) => (
        <div key={clave}>{render(() => setAbiertos((lista) => lista.filter((a) => a.clave !== clave)))}</div>
      ))}
      <div className="tarjetas-ia" ref={setPila} />
    </Contexto.Provider>
  );
}

export function usarSegundoPlano(): ContextoSegundoPlano {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta ProveedorSegundoPlano en app.tsx.');
  return contexto;
}

// Cuando se guarda algo generado con IA, la pantalla que lo lista se recarga (aunque se haya vuelto a abrir).
const EVENTO_GUARDADO_IA = 'syntra:ia-guardado';
export const avisarGuardadoIA = () => window.dispatchEvent(new Event(EVENTO_GUARDADO_IA));
export function usarRecargaAlGuardarIA(recargar: () => unknown): void {
  const ultima = useRef(recargar);
  ultima.current = recargar;
  useEffect(() => {
    const alGuardar = () => void ultima.current();
    window.addEventListener(EVENTO_GUARDADO_IA, alGuardar);
    return () => window.removeEventListener(EVENTO_GUARDADO_IA, alGuardar);
  }, []);
}

interface VentanaIAProps {
  generando: boolean;
  // Terminó de generar y hay algo para revisar.
  listo: boolean;
  // Qué se genera, para el cartel: "las flashcards", "la guía de preguntas"…
  que: string;
  mensaje: string;
  detalle?: string;
  onCancelar: () => void;
  // Qué hace "Ver" en el cartel de listo. Por defecto abre el modal con el resultado.
  alVer?: () => void;
  textoVer?: string;
  children: ReactNode; // el modal completo
}

export function VentanaIA({ generando, listo, que, mensaje, detalle, onCancelar, alVer, textoVer = 'Ver', children }: VentanaIAProps) {
  const { pila } = usarSegundoPlano();
  const [verResultado, setVerResultado] = useState(true);
  // Con la flechita el cartel se achica a una pastilla para que no tape la pantalla.
  const [achicado, setAchicado] = useState(false);

  useEffect(() => {
    if (generando) setVerResultado(false);
  }, [generando]);

  useEffect(() => {
    if (listo && !verResultado) hablar(`Listo, ya tenés ${que}.`);
  }, [listo]);

  const cartel = (contenido: ReactNode, terminado = false) =>
    pila &&
    createPortal(
      <section className={`tarjeta-ia${terminado ? ' tarjeta-ia--lista' : ''}`} role="status" aria-live="polite">
        {contenido}
      </section>,
      pila,
    );

  if (generando && achicado) {
    return (
      pila &&
      createPortal(
        <button type="button" className="tarjeta-ia-pastilla" onClick={() => setAchicado(false)} title="Mostrar el cartel" aria-label={`${mensaje}. Mostrar el cartel`}>
          <span className="tarjeta-ia-pastilla__chispa" aria-hidden="true"><Sparkles size={16} /></span>
          {mensaje}…
          <ChevronUp size={16} aria-hidden="true" />
        </button>,
        pila,
      )
    );
  }

  if (generando) {
    return cartel(
      <>
        <button type="button" className="tarjeta-ia__ocultar" onClick={() => setAchicado(true)} title="Ocultar" aria-label="Ocultar el cartel">
          <ChevronDown size={18} />
        </button>
        <IndicadorIA mensaje={mensaje} detalle={detalle} />
        <p className="tarjeta-ia__nota">Podés seguir usando Syntra mientras tanto.</p>
        <button type="button" className="tarjeta-ia__boton tarjeta-ia__boton--secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </>,
    );
  }

  if (listo && !verResultado) {
    return cartel(
      <>
        <span className="tarjeta-ia__icono" aria-hidden="true"><Sparkles size={22} /></span>
        <p className="tarjeta-ia__titulo">¡Listo! Ya tenés {que}.</p>
        <div className="tarjeta-ia__acciones">
          <button type="button" className="tarjeta-ia__boton" autoFocus onClick={() => (alVer ? alVer() : setVerResultado(true))}>
            {textoVer}
          </button>
        </div>
      </>,
      true,
    );
  }

  return <>{children}</>;
}
