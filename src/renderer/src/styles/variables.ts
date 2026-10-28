import { colors } from './colors';

// Los mismos nombres que `colors`, pero apuntando a las variables CSS que publica issue.ts.
// Sirve para estilos en línea: así siguen al modo oscuro y a la paleta elegida.
export const cssVar = Object.fromEntries(
  Object.keys(colors).map((nombre) => [nombre, `var(--color-${nombre.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)})`]),
) as Record<keyof typeof colors, string>;