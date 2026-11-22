import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTeclado, PointerEvent as EventoPuntero } from 'react';
import { GripHorizontal, X } from 'lucide-react';
import type { NotaRapida } from '../../types/notasRapidas';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';
import '../../styles/notasRapidas.css';

// Tonos pastel sacados de la paleta elegida (ver notasRapidas.css).
// Cuatro tonos de la paleta elegida (acento y principal, cada uno suave y fuerte): nunca se repiten.
const TONOS = ['Acento suave', 'Acento', 'Principal suave', 'Principal'];

// La nota nueva toma el tono menos usado en la carpeta, así las notas no quedan todas iguales.
const tonoSiguiente = (notas: NotaRapida[]) => {
  const usos = TONOS.map((_, i) => notas.filter((n) => n.color === i).length);
  return usos.indexOf(Math.min(...usos));
};
const MAXIMO = 300;
const ANCHO_NOTA = 176;
const PASO_TECLADO = 16;

type Posicion = { x: number; y: number }; // en píxeles dentro de la carpeta

interface NotasRapidasProps {
  idNodo: number;
  creando: boolean; // se eligió "Nota rápida" en el menú de agregar
  onTerminarCrear: () => void;
}

// Post-its de la carpeta. Flotan sobre la pantalla y se arrastran desde la barrita de arriba a donde quieras;
// el lugar queda guardado. Son de cada usuario: en un proyecto, las demás no las ven.
// Clic en el texto para editar: Enter guarda, Shift+Enter baja de línea, Escape cancela.
export function NotasRapidas({ idNodo, creando, onTerminarCrear }: NotasRapidasProps) {
  const avisos = usarAvisos();
  const usuarioId = obtenerUsuarioId() ?? 0;
  const [notas, setNotas] = useState<NotaRapida[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [arrastre, setArrastre] = useState<{ idNota: number; pos: Posicion } | null>(null);
  const [arriba, setArriba] = useState<number | null>(null); // la última tocada queda encima
  const capa = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const agarre = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    let vigente = true;
    window.api
      .listarNotasRapidas({ usuarioId, idNodo })
      .then((lista) => vigente && setNotas(lista))
      .catch(() => vigente && setNotas([]));
    return () => {
      vigente = false;
    };
  }, [usuarioId, idNodo]);

  // El ancho de la carpeta: la posición x se guarda en porcentaje para que se acomode si cambia la ventana.
  useLayoutEffect(() => {
    const elemento = capa.current;
    if (!elemento) return;
    const medir = () => setAncho(elemento.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [notas.length > 0 || creando]);

  if (notas.length === 0 && !creando) return null;

  const limiteX = Math.max(0, ancho - ANCHO_NOTA);
  const acotar = (pos: Posicion): Posicion => ({
    x: Math.min(Math.max(pos.x, 0), limiteX),
    y: Math.min(Math.max(pos.y, 0), Math.max(0, (capa.current?.clientHeight ?? 400) - 48)),
  });

  // Sin lugar guardado: en columnas desde la derecha, debajo de la barra de la carpeta.
  const porDefecto = (indice: number): Posicion =>
    acotar({ x: limiteX - (indice % 3) * (ANCHO_NOTA + 12), y: 360 + Math.floor(indice / 3) * 128 });

  const posicionDe = (nota: NotaRapida, indice: number): Posicion => {
    if (arrastre?.idNota === nota.idNota) return arrastre.pos;
    if (nota.posX === null || nota.posY === null) return porDefecto(indice);
    return acotar({ x: (nota.posX / 100) * ancho, y: nota.posY });
  };

  const fallo = (e: unknown, porDefectoMensaje: string) => avisos.error(extraerMensajeError(e, porDefectoMensaje));

  async function crear(texto: string, color: number) {
    try {
      const nueva = await window.api.crearNotaRapida({ usuarioId, idNodo, texto, color });
      setNotas((actuales) => [...actuales, nueva]);
      onTerminarCrear();
    } catch (e) {
      fallo(e, 'No se pudo guardar la nota.');
    }
  }

  async function modificar(idNota: number, cambios: { texto?: string; color?: number; posX?: number; posY?: number }) {
    try {
      const nota = await window.api.modificarNotaRapida({ usuarioId, idNota, ...cambios });
      setNotas((actuales) => actuales.map((n) => (n.idNota === idNota ? nota : n)));
      return true;
    } catch (e) {
      fallo(e, 'No se pudo guardar la nota.');
      return false;
    }
  }

  async function eliminar(idNota: number) {
    try {
      await window.api.eliminarNotaRapida({ usuarioId, idNota });
      setNotas((actuales) => actuales.filter((n) => n.idNota !== idNota));
    } catch (e) {
      fallo(e, 'No se pudo borrar la nota.');
    }
  }

  // Guarda el lugar: x en porcentaje del ancho, y en píxeles.
  const guardarLugar = (idNota: number, pos: Posicion) => {
    const posX = ancho > 0 ? Math.round((pos.x / ancho) * 1000) / 10 : 0;
    // Se actualiza enseguida en pantalla; si falla, el aviso lo dice.
    setNotas((actuales) => actuales.map((n) => (n.idNota === idNota ? { ...n, posX, posY: Math.round(pos.y) } : n)));
    void modificar(idNota, { posX, posY: Math.round(pos.y) });
  };

  const empezarArrastre = (nota: NotaRapida, indice: number, e: EventoPuntero<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const inicial = posicionDe(nota, indice);
    const caja = capa.current!.getBoundingClientRect();
    agarre.current = { dx: e.clientX - caja.left - inicial.x, dy: e.clientY - caja.top - inicial.y };
    setArriba(nota.idNota);
    setArrastre({ idNota: nota.idNota, pos: inicial });
  };

  const moverArrastre = (e: EventoPuntero<HTMLElement>) => {
    if (!arrastre || !agarre.current) return;
    const caja = capa.current!.getBoundingClientRect();
    setArrastre({ idNota: arrastre.idNota, pos: acotar({ x: e.clientX - caja.left - agarre.current.dx, y: e.clientY - caja.top - agarre.current.dy }) });
  };

  const soltarArrastre = () => {
    if (arrastre) guardarLugar(arrastre.idNota, arrastre.pos);
    agarre.current = null;
    setArrastre(null);
  };

  // Con el teclado: la barrita se enfoca con Tab y las flechas la mueven.
  const moverConTeclado = (nota: NotaRapida, indice: number, e: EventoTeclado<HTMLElement>) => {
    const pasos: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const paso = pasos[e.key];
    if (!paso) return;
    e.preventDefault();
    const actual = posicionDe(nota, indice);
    guardarLugar(nota.idNota, acotar({ x: actual.x + paso[0] * PASO_TECLADO, y: actual.y + paso[1] * PASO_TECLADO }));
  };

  return (
    <div className="notas-rapidas" ref={capa} aria-label="Notas rápidas (solo las ves vos)" role="region">
      {notas.map((nota, indice) => {
        const pos = posicionDe(nota, indice);
        const estilo = { left: pos.x, top: pos.y, zIndex: arriba === nota.idNota || editando === nota.idNota ? 3 : 2 };
        if (editando === nota.idNota) {
          return (
            <EditorNota
              key={nota.idNota}
              estilo={estilo}
              textoInicial={nota.texto}
              colorInicial={nota.color}
              onGuardar={async (texto, color) => {
                if (await modificar(nota.idNota, { texto, color })) setEditando(null);
              }}
              onCancelar={() => setEditando(null)}
            />
          );
        }
        return (
          <article
            key={nota.idNota}
            className={`nota-rapida nota-rapida--${nota.color}${arrastre?.idNota === nota.idNota ? ' nota-rapida--arrastrando' : ''}`}
            style={estilo}
            title="Solo la ves vos"
          >
            <div
              className="nota-rapida__agarre"
              role="button"
              tabIndex={0}
              aria-label="Mover la nota (usá las flechas)"
              onPointerDown={(e) => empezarArrastre(nota, indice, e)}
              onPointerMove={moverArrastre}
              onPointerUp={soltarArrastre}
              onPointerCancel={soltarArrastre}
              onKeyDown={(e) => moverConTeclado(nota, indice, e)}
            >
              <GripHorizontal size={14} aria-hidden="true" />
            </div>
            <button type="button" className="nota-rapida__texto" onClick={() => setEditando(nota.idNota)} title="Editar la nota">
              {nota.texto}
            </button>
            <button type="button" className="nota-rapida__borrar" onClick={() => void eliminar(nota.idNota)} aria-label={`Borrar la nota: ${nota.texto}`}>
              <X size={14} />
            </button>
          </article>
        );
      })}
      {creando && (
        <EditorNota
          estilo={{ ...porDefecto(notas.length), zIndex: 3 }}
          textoInicial=""
          colorInicial={tonoSiguiente(notas)}
          onGuardar={(t, c) => void crear(t, c)}
          onCancelar={onTerminarCrear}
        />
      )}
    </div>
  );
}

interface EditorNotaProps {
  estilo: { left?: number; top?: number; x?: number; y?: number; zIndex: number };
  textoInicial: string;
  colorInicial: number;
  onGuardar: (texto: string, color: number) => void;
  onCancelar: () => void;
}

function EditorNota({ estilo, textoInicial, colorInicial, onGuardar, onCancelar }: EditorNotaProps) {
  const [texto, setTexto] = useState(textoInicial);
  const [color, setColor] = useState(colorInicial);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => campo.current?.focus(), []);

  const guardar = () => (texto.trim() ? onGuardar(texto.trim(), color) : onCancelar());
  const lugar = { left: estilo.left ?? estilo.x, top: estilo.top ?? estilo.y, zIndex: estilo.zIndex };

  return (
    <article className={`nota-rapida nota-rapida--${color} nota-rapida--editando`} style={lugar}>
      <textarea
        ref={campo}
        className="nota-rapida__campo"
        value={texto}
        maxLength={MAXIMO}
        placeholder="Escribí un recordatorio"
        aria-label="Texto de la nota"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            guardar();
          } else if (e.key === 'Escape') {
            onCancelar();
          }
        }}
      />
      <div className="nota-rapida__pie">
        <div className="nota-rapida__colores" role="radiogroup" aria-label="Color de la nota">
          {TONOS.map((nombre, i) => (
            <button
              key={nombre}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={nombre}
              title={nombre}
              className={`nota-rapida__color nota-rapida--${i}${color === i ? ' nota-rapida__color--elegido' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setColor(i)}
            />
          ))}
        </div>
        <button type="button" className="nota-rapida__listo" onClick={guardar}>Listo</button>
      </div>
    </article>
  );
}
