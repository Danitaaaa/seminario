import { JSDOM } from 'jsdom';

// Entorno para probar el modo voz fuera de Electron: una página falsa (jsdom),
// una voz falsa que anota lo que dice Syntra y un window.api falso para el lector de pantalla.
// Se importa primero en cada test, antes que los archivos de src/renderer/src/voz.

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/#/dashboard',
  pretendToBeVisual: true,
});
const w = dom.window;

const globales = [
  'window', 'document', 'localStorage', 'Node', 'Event', 'CustomEvent', 'KeyboardEvent', 'FocusEvent',
  'MouseEvent', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLButtonElement',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
] as const;
for (const nombre of globales) {
  Object.defineProperty(globalThis, nombre, { value: w[nombre as keyof typeof w], configurable: true, writable: true });
}
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// ---- Voz falsa: anota cada frase que se manda a hablar ----
type FraseFalsa = { text: string; lang: string; rate: number; voice: { name: string } | null; onend: (() => void) | null };

export const dichos: string[] = [];
export const voces = [
  { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' },
  { name: 'Microsoft Laura - Spanish (Spain)', lang: 'es-ES' },
];
let ultimaFrase: FraseFalsa | null = null;

class Frase implements FraseFalsa {
  lang = '';
  rate = 1;
  voice: { name: string } | null = null;
  onend: (() => void) | null = null;
  constructor(public text: string) {}
}

Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: Frase, configurable: true });
Object.defineProperty(globalThis, 'speechSynthesis', {
  configurable: true,
  value: {
    speaking: false,
    getVoices: () => voces,
    addEventListener: () => undefined,
    cancel: () => undefined,
    resume: () => undefined,
    speak: (frase: FraseFalsa) => {
      dichos.push(frase.text);
      ultimaFrase = frase;
    },
  },
});

export const ultima = () => ultimaFrase;

// Simula que la voz terminó de decir la última frase.
export function terminarFrase(): void {
  const frase = ultimaFrase;
  ultimaFrase = null;
  frase?.onend?.();
}

// ---- window.api falso: si NVDA está prendido ----
export const estado = { lector: false };
(w as unknown as { api: unknown }).api = {
  lectorPantallaActivo: async () => estado.lector,
  alCambiarLector: () => () => undefined,
};

// hablar() espera 50 ms antes de decir la frase (para destrabar Chromium).
export const esperar = (ms = 80) => new Promise((resolver) => setTimeout(resolver, ms));

export function irA(ruta: string): void {
  w.location.hash = `#${ruta}`;
}

export function limpiar(): void {
  dichos.length = 0;
  ultimaFrase = null;
  estado.lector = false;
  document.body.innerHTML = '';
  irA('/dashboard');
}

export function tecla(key: string, opciones: KeyboardEventInit = {}, destino: EventTarget = document): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opciones });
  destino.dispatchEvent(evento);
  return evento;
}

export function enfocar(el: HTMLElement): void {
  el.focus();
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

// ---- Casos con el formato del equipo: ID, nombre, salida esperada y obtenida ----
let bien = 0;
let mal = 0;

export async function caso(id: number, nombre: string, esperada: string, prueba: () => Promise<string> | string) {
  limpiar();
  console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
  try {
    const obtenida = await prueba();
    if (obtenida !== esperada) throw new Error(`Se obtuvo "${obtenida}"`);
    bien++;
    console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
  } catch (error) {
    mal++;
    console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
  }
}

export function resumen(): void {
  console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
  if (mal > 0) process.exitCode = 1;
}
