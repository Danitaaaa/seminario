import { colors } from "./colors";
import { spacing, dimensiones } from "./spacing";
import { typography } from "./typography";
import { globales } from "./globales";

type Tokens = Record<string, string | number>;

// primaryDark -> primary-dark
const aKebab = (texto: string) => texto.replace(/([A-Z])/g, "-$1").toLowerCase();

// Cada grupo de tokens TS se publica como variables CSS con un prefijo.
// Ej.: colors.primaryDark -> --color-primary-dark
const grupos: Array<[prefijo: string, tokens: Tokens]> = [
  ["color", colors],
  ["espacio", spacing],
  ["dim", dimensiones],
  ["fuente", typography.fontFamily],
  ["tamano", typography.fontSize],
  ["peso", typography.fontWeight],
  ["radio", globales.radios],
  ["sombra", globales.sombras],
];

// Los archivos .ts son la única fuente de verdad; el CSS solo las consume.
// Llamar una sola vez al arrancar la app (main.tsx).
export function aplicarTema(raiz: HTMLElement = document.documentElement): void {
  for (const [prefijo, tokens] of grupos) {
    for (const [nombre, valor] of Object.entries(tokens)) {
      raiz.style.setProperty(`--${prefijo}-${aKebab(nombre)}`, String(valor));
    }
  }
}