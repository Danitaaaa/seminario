import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { MapaMental } from '../../types/ia';

// Dibuja el mapa mental: el tema central en el medio y sus ramas repartidas a la izquierda y
// a la derecha. Se mueve arrastrando y se acerca o aleja con la rueda o los botones.

const CARACTERES_POR_RENGLON = 22;
const MAX_RENGLONES = 3;
const ALTO_RENGLON = 18;
const SEPARACION_X = 56;
const SEPARACION_Y = 14;
const MARGEN = 40;

interface Caja {
  id: string;
  renglones: string[];
  ancho: number;
  alto: number;
  x: number; // centro
  y: number; // centro
  lado: 1 | -1;
  nivel: number;
  rama: number; // a qué rama del tema central pertenece (para el color)
  hijos: Caja[];
}

// Parte el texto en renglones cortos por palabras; si no entra, el último termina en "…".
function partirTexto(texto: string): string[] {
  const renglones: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    if (actual && (actual + ' ' + palabra).length > CARACTERES_POR_RENGLON) {
      renglones.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) renglones.push(actual);
  if (renglones.length > MAX_RENGLONES) {
    const cortados = renglones.slice(0, MAX_RENGLONES);
    cortados[MAX_RENGLONES - 1] = `${cortados[MAX_RENGLONES - 1].slice(0, CARACTERES_POR_RENGLON - 1)}…`;
    return cortados;
  }
  return renglones.length ? renglones : [''];
}

function crearCaja(id: string, texto: string, nivel: number): Caja {
  const renglones = partirTexto(texto);
  const largo = Math.max(...renglones.map((r) => r.length));
  const ancho = Math.min(230, Math.max(nivel === 0 ? 120 : 84, largo * 7.4 + 30));
  return { id, renglones, ancho, alto: renglones.length * ALTO_RENGLON + 18, x: 0, y: 0, lado: 1, nivel, rama: 0, hijos: [] };
}

function contarHojas(caja: Caja): number {
  return caja.hijos.length ? caja.hijos.reduce((total, h) => total + contarHojas(h), 0) : 1;
}

// Ubica una rama: cada hoja ocupa su propio renglón y cada padre queda a la altura media de sus hijos.
function ubicarRama(raices: Caja[], lado: 1 | -1, bordeInicial: number): Caja[] {
  const todas: Caja[] = [];
  let cursor = 0;
  const ubicar = (caja: Caja, borde: number) => {
    caja.lado = lado;
    caja.x = borde + lado * (caja.ancho / 2);
    todas.push(caja);
    const bordeHijos = caja.x + lado * (caja.ancho / 2 + SEPARACION_X);
    if (!caja.hijos.length) {
      caja.y = cursor + caja.alto / 2;
      cursor += caja.alto + SEPARACION_Y;
      return;
    }
    caja.hijos.forEach((h) => ubicar(h, bordeHijos));
    caja.y = (caja.hijos[0].y + caja.hijos[caja.hijos.length - 1].y) / 2;
  };
  raices.forEach((r) => ubicar(r, bordeInicial));
  // Se centra la rama a la altura del tema central.
  if (todas.length) {
    const arriba = Math.min(...todas.map((c) => c.y - c.alto / 2));
    const abajo = Math.max(...todas.map((c) => c.y + c.alto / 2));
    const corrimiento = -(arriba + abajo) / 2;
    todas.forEach((c) => { c.y += corrimiento; });
  }
  return todas;
}

export function armarDibujo(mapa: MapaMental) {
  const cajas = new Map<string, Caja>();
  const nivelDe = (id: string, vistos = new Set<string>()): number => {
    const nodo = mapa.nodos.find((n) => n.id === id);
    if (!nodo?.padreId || vistos.has(id)) return 0;
    vistos.add(id);
    return 1 + nivelDe(nodo.padreId, vistos);
  };
  for (const n of mapa.nodos) cajas.set(n.id, crearCaja(n.id, n.texto, nivelDe(n.id)));
  let raiz: Caja | null = null;
  for (const n of mapa.nodos) {
    const caja = cajas.get(n.id)!;
    if (n.padreId === null) raiz = caja;
    else cajas.get(n.padreId)?.hijos.push(caja);
  }
  if (!raiz) return null;

  // Cada rama del tema central lleva su color; se reparten a los dos lados según su tamaño.
  const marcarRama = (caja: Caja, rama: number) => {
    caja.rama = rama;
    caja.hijos.forEach((h) => marcarRama(h, rama));
  };
  raiz.hijos.forEach((h, i) => marcarRama(h, i));
  // Se corta la lista de ramas en el punto que deja los dos lados más parejos (sin cambiar el orden).
  const hojas = raiz.hijos.map(contarHojas);
  const totalHojas = hojas.reduce((t, n) => t + n, 0);
  let corte = raiz.hijos.length;
  if (raiz.hijos.length >= 3) {
    let acumuladas = 0;
    let mejorDiferencia = Infinity;
    hojas.forEach((n, i) => {
      acumuladas += n;
      const diferencia = Math.abs(totalHojas - 2 * acumuladas);
      if (i < hojas.length - 1 && diferencia < mejorDiferencia) {
        mejorDiferencia = diferencia;
        corte = i + 1;
      }
    });
  }
  const derecha = raiz.hijos.slice(0, corte);
  const izquierda = raiz.hijos.slice(corte);

  const borde = raiz.ancho / 2 + SEPARACION_X;
  const todas = [raiz, ...ubicarRama(derecha, 1, borde), ...ubicarRama(izquierda, -1, -borde)];

  const lineas: { desde: Caja; hasta: Caja }[] = [];
  for (const caja of todas) for (const hijo of caja.hijos) lineas.push({ desde: caja, hasta: hijo });

  const limites = {
    x: Math.min(...todas.map((c) => c.x - c.ancho / 2)) - MARGEN,
    y: Math.min(...todas.map((c) => c.y - c.alto / 2)) - MARGEN,
    ancho: 0,
    alto: 0,
  };
  limites.ancho = Math.max(...todas.map((c) => c.x + c.ancho / 2)) + MARGEN - limites.x;
  limites.alto = Math.max(...todas.map((c) => c.y + c.alto / 2)) + MARGEN - limites.y;
  return { cajas: todas, lineas, limites };
}

// Curva suave del borde del padre al borde del hijo.
function curva(desde: Caja, hasta: Caja): string {
  const lado = hasta.lado;
  const x1 = desde.x + lado * (desde.ancho / 2);
  const x2 = hasta.x - lado * (hasta.ancho / 2);
  const medio = (x1 + x2) / 2;
  return `M ${x1} ${desde.y} C ${medio} ${desde.y}, ${medio} ${hasta.y}, ${x2} ${hasta.y}`;
}

interface MapaMentalDibujoProps {
  mapa: MapaMental;
  // Para editar: la idea elegida se resalta; tocar una idea la elige y tocar el fondo la suelta.
  seleccionado?: string | null;
  onSeleccionar?: (id: string | null) => void;
}

// Movimiento máximo (px) para que soltar el puntero cuente como un toque y no como un arrastre.
const TOLERANCIA_TOQUE = 5;

export function MapaMentalDibujo({ mapa, seleccionado = null, onSeleccionar }: MapaMentalDibujoProps) {
  const dibujo = useMemo(() => armarDibujo(mapa), [mapa]);
  const dibujoActual = useRef(dibujo);
  dibujoActual.current = dibujo;
  const contenedor = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState({ escala: 1, x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number; inicioX: number; inicioY: number; idNodo: string | null } | null>(null);

  // Muestra el mapa entero, centrado en el recuadro. Solo al abrirlo, al cambiar el tamaño
  // o con el botón: mientras se edita, la vista no salta con cada cambio.
  const ajustar = useCallback(() => {
    const caja = contenedor.current;
    const dibujo = dibujoActual.current;
    if (!caja || !dibujo) return;
    const { limites } = dibujo;
    const escala = Math.min(1.4, caja.clientWidth / limites.ancho, caja.clientHeight / limites.alto);
    setVista({
      escala,
      x: (caja.clientWidth - limites.ancho * escala) / 2 - limites.x * escala,
      y: (caja.clientHeight - limites.alto * escala) / 2 - limites.y * escala,
    });
  }, []);

  useEffect(() => {
    ajustar();
    const caja = contenedor.current;
    if (!caja) return;
    const observador = new ResizeObserver(ajustar);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [ajustar]);

  // Acerca o aleja manteniendo fijo el punto que se señala.
  const acercar = (factor: number, cx?: number, cy?: number) => {
    const caja = contenedor.current;
    if (!caja) return;
    const px = cx ?? caja.clientWidth / 2;
    const py = cy ?? caja.clientHeight / 2;
    setVista((v) => {
      const escala = Math.min(3, Math.max(0.2, v.escala * factor));
      const real = escala / v.escala;
      return { escala, x: px - (px - v.x) * real, y: py - (py - v.y) * real };
    });
  };

  const rueda = (e: WheelEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    acercar(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - caja.left, e.clientY - caja.top);
  };

  const empezarArrastre = (e: PointerEvent<HTMLDivElement>) => {
    const nodo = (e.target as Element).closest?.('[data-id]');
    arrastre.current = { x: e.clientX, y: e.clientY, inicioX: e.clientX, inicioY: e.clientY, idNodo: nodo?.getAttribute('data-id') ?? null };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    const dx = e.clientX - arrastre.current.x;
    const dy = e.clientY - arrastre.current.y;
    arrastre.current = { ...arrastre.current, x: e.clientX, y: e.clientY };
    setVista((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || !onSeleccionar) return;
    const toque = Math.hypot(e.clientX - a.inicioX, e.clientY - a.inicioY) < TOLERANCIA_TOQUE;
    if (toque) onSeleccionar(a.idNodo);
  };
  const cancelar = () => { arrastre.current = null; };

  if (!dibujo) return <p className="mapa-dibujo__vacio">Este mapa no tiene un tema central.</p>;

  return (
    <div className="mapa-dibujo">
      <div className="mapa-dibujo__controles">
        <button type="button" onClick={() => acercar(1.2)} aria-label="Acercar" title="Acercar"><Plus size={16} /></button>
        <button type="button" onClick={() => acercar(1 / 1.2)} aria-label="Alejar" title="Alejar"><Minus size={16} /></button>
        <button type="button" onClick={ajustar} aria-label="Ver el mapa entero" title="Ver el mapa entero"><Maximize2 size={16} /></button>
      </div>
      <div
        ref={contenedor}
        className={`mapa-dibujo__lienzo${onSeleccionar ? ' mapa-dibujo__lienzo--editable' : ''}`}
        onWheel={rueda}
        onPointerDown={empezarArrastre}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={cancelar}
      >
        <svg width="100%" height="100%" role="img" aria-label={`Mapa mental: ${mapa.titulo}`}>
          <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`}>
            {dibujo.lineas.map(({ desde, hasta }) => (
              <path key={`${desde.id}-${hasta.id}`} d={curva(desde, hasta)} className={`mapa-dibujo__linea rama-${hasta.rama % 6}`} />
            ))}
            {dibujo.cajas.map((caja) => (
              <g
                key={caja.id}
                data-id={caja.id}
                className={`mapa-dibujo__nodo nivel-${Math.min(caja.nivel, 2)} rama-${caja.rama % 6}${caja.id === seleccionado ? ' mapa-dibujo__nodo--elegido' : ''}`}
              >
                <rect x={caja.x - caja.ancho / 2} y={caja.y - caja.alto / 2} width={caja.ancho} height={caja.alto} rx={caja.nivel === 0 ? 14 : 10} />
                <text x={caja.x} y={caja.y - ((caja.renglones.length - 1) * ALTO_RENGLON) / 2} textAnchor="middle" dominantBaseline="central">
                  {caja.renglones.map((renglon, i) => (
                    <tspan key={i} x={caja.x} dy={i === 0 ? 0 : ALTO_RENGLON}>{renglon}</tspan>
                  ))}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
