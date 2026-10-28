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
    frostBlue: base.primarioClaro,
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