import { spacing, dimensiones } from "./spacing";
import { typography } from "./typography";
import { globales } from "./globales";
import { syntra, type Modo } from "./temas/syntra";

type Tokens = Record<string, string | number>;

// primaryDark -> primary-dark
const aKebab = (texto: string) => texto.replace(/([A-Z])/g, "-$1").toLowerCase();

const gruposFijos: Array<[prefijo: string, tokens: Tokens]> = [
  ["espacio", spacing],
  ["dim", dimensiones],
  ["fuente", typography.fontFamily],
  ["tamano", typography.fontSize],
  ["peso", typography.fontWeight],
  ["radio", globales.radios],
  ["sombra", globales.sombras],
];

function publicar(raiz: HTMLElement, prefijo: string, tokens: Tokens): void {
  for (const [nombre, valor] of Object.entries(tokens)) {
    raiz.style.setProperty(`--${prefijo}-${aKebab(nombre)}`, String(valor));
  }
}

// Los .ts son la única fuente de verdad; el CSS solo consume las variables.
export function aplicarTema(modo: Modo = "claro", raiz: HTMLElement = document.documentElement): void {
  publicar(raiz, "color", syntra[modo]);
  for (const [prefijo, tokens] of gruposFijos) publicar(raiz, prefijo, tokens);
  raiz.dataset.modo = modo;
}