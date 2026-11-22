import type { colors } from "../colors";
import type { Modo } from "./syntra";

export type Colores = typeof colors;

// Los 12 colores que definen una paleta; el resto de los tokens se deriva de estos.
export interface BasePaleta {
  lateral: string;
  lateralTexto: string;
  activo: string;
  fondo: string;
  superficie: string;
  suave: string;
  borde: string;
  primario: string;
  primarioClaro: string;
  acento: string;
  texto: string;
  textoSecundario: string;
}

// Los estados (éxito, aviso, error) son iguales en todas las paletas para que se reconozcan siempre.
const ESTADOS: Record<Modo, Pick<Colores, "success" | "warning" | "error" | "errorBg" | "errorTexto">> = {
  claro: { success: "#4C8C5A", warning: "#D9A441", error: "#B84C4C", errorBg: "#FBEAEA", errorTexto: "#8A3535" },
  oscuro: { success: "#6FB57E", warning: "#E5B95E", error: "#E07A7A", errorBg: "#3A1D2A", errorTexto: "#F2B8B8" },
};

// --- Contraste (fórmula de WCAG) ---
const canales = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const aHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const luminancia = (hex: string) => {
  const [r, g, b] = canales(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: string, b: string) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const mezclar = (a: string, b: string, peso: number) => {
  const [ca, cb] = [canales(a), canales(b)];
  return aHex(ca.map((v, i) => v * peso + cb[i] * (1 - peso)));
};

// Oscurece `color` hacia `fondo` hasta que el texto claro se lea encima (contraste mínimo 4.5, el de WCAG).
function fondoLegible(color: string, fondo: string, texto: string): string {
  for (let peso = 1; peso > 0; peso -= 0.05) {
    const tono = mezclar(color, fondo, peso);
    if (contraste(tono, texto) >= 4.5 && contraste(tono, "#FFFFFF") >= 4.5) return tono;
  }
  return fondo;
}

export function crearPaleta(base: BasePaleta, modo: Modo): Colores {
  return {
    primary: base.primario,
    primaryLight: base.primarioClaro,
    primaryDark: base.activo,
    secondary: base.acento,
    accent: base.acento,
    background: base.fondo,
    surface: base.superficie,
    border: base.borde,
    textPrimary: base.texto,
    textSecondary: base.textoSecundario,
    text: base.texto,
    textLight: base.textoSecundario,
    white: "#FFFFFF",
    steel: base.textoSecundario,
    // En oscuro, primarioClaro es muy claro para usarlo de fondo con texto claro (paneles, fichas, notificaciones).
    frostBlue: modo === "oscuro" ? fondoLegible(base.primarioClaro, base.fondo, base.texto) : base.primarioClaro,
    frostClaro: base.suave,
    storm: base.texto,
    lateralFondo: base.lateral,
    lateralTexto: base.lateralTexto,
    splashFondo: base.lateral,
    splashCentro: base.primario,
    splashBrillo: base.primarioClaro,
    crema: base.suave,
    cremaOscuro: base.borde,
    frostSuave: base.suave,
    noche: base.lateral,
    nocheClaro: base.activo,
    ...ESTADOS[modo],
  };
}