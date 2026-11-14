import { detener, hablar } from './narrador';

export type Bloque = { texto: string; esTitulo: boolean };

let bloques: Bloque[] = [];
let indice = 0;
let leyendo = false;

// Los párrafos largos se parten en oraciones: Chromium corta las frases muy largas.
function partir(lista: Bloque[]): Bloque[] {
  return lista.flatMap((b) =>
    b.esTitulo
      ? [b]
      : b.texto.split(/(?<=[.!?])\s+/).map((texto) => ({ texto, esTitulo: false }))
  ).filter((b) => b.texto.trim());
}

function leerActual(): void {
  if (indice >= bloques.length) {
    leyendo = false;
    hablar('Fin del documento.');
    return;
  }
  leyendo = true;
  const { texto, esTitulo } = bloques[indice];
  hablar(esTitulo ? `Título: ${texto}` : texto, () => {
    indice++;
    leerActual();
  });
}

export function empezarLectura(nuevos: Bloque[]): void {
  bloques = partir(nuevos);
  indice = 0;
  if (!bloques.length) return hablar('Este archivo no tiene texto para leer.');
  leerActual();
}

export function pausarLectura(): void {
  if (!leyendo) return;
  leyendo = false;
  hablar('Pausado');
}

export function seguirLectura(): void {
  if (!leyendo && indice < bloques.length) leerActual();
}

// Busca el primer título desde una posición, hacia adelante (1) o hacia atrás (-1).
function tituloDesde(desde: number, sentido: 1 | -1): number {
  for (let i = desde; i >= 0 && i < bloques.length; i += sentido) {
    if (bloques[i].esTitulo) return i;
  }
  return -1;
}

// Salta al título siguiente o anterior (en un PDF, cada página es un título) y sigue leyendo.
// Si no hay a dónde saltar, lo avisa y retoma el bloque en el que estaba.
function saltarTitulo(sentido: 1 | -1): void {
  const destino =
    sentido === 1 ? tituloDesde(indice + 1, 1) : tituloDesde(tituloDesde(indice, -1) - 1, -1);
  if (destino === -1) {
    hablar(sentido === 1 ? 'No hay más páginas.' : 'Es la primera página.', leerActual);
    return;
  }
  indice = destino;
  leerActual();
}

export function siguienteTitulo(): void {
  saltarTitulo(1);
}

export function anteriorTitulo(): void {
  saltarTitulo(-1);
}

export function detenerLectura(): void {
  leyendo = false;
  bloques = [];
  indice = 0;
  detener();
}