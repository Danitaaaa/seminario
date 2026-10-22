import { syntra, type Modo } from "./syntra";
import { crearPaleta, type BasePaleta, type Colores } from "./crearPaleta";

export interface Paleta {
  id: string;
  nombre: string;
  modos: Record<Modo, Colores>;
}

const paleta = (id: string, nombre: string, claro: BasePaleta, oscuro: BasePaleta): Paleta => ({
  id,
  nombre,
  modos: { claro: crearPaleta(claro, "claro"), oscuro: crearPaleta(oscuro, "oscuro") },
});

// Para sumar una paleta solo se agrega una entrada acá.
export const PALETAS: Paleta[] = [
  { id: "syntra", nombre: "Syntra", modos: syntra },

  paleta("luna", "Luna",
    { lateral: "#420D4B", lateralTexto: "#F5D5E0", activo: "#5A1F66", fondo: "#FBF4F7", superficie: "#FFFFFF", suave: "#F5D5E0", borde: "#EAD3DE", primario: "#7B337E", primarioClaro: "#B07AB3", acento: "#6667AB", texto: "#210635", textoSecundario: "#5E4A66" },
    { lateral: "#1A0429", lateralTexto: "#F5D5E0", activo: "#5A1F66", fondo: "#210635", superficie: "#2C0C42", suave: "#35124D", borde: "#4A2360", primario: "#9B5A9E", primarioClaro: "#C9A3D9", acento: "#8E8FD0", texto: "#F5D5E0", textoSecundario: "#C7A9C9" }),

  paleta("lavanda", "Lavanda",
    { lateral: "#4A47A3", lateralTexto: "#FFFFFF", activo: "#2E2A6B", fondo: "#F6F5FB", superficie: "#FFFFFF", suave: "#ECEAF7", borde: "#DCD9EC", primario: "#4A47A3", primarioClaro: "#8C89D9", acento: "#E68AA8", texto: "#1D1A3A", textoSecundario: "#5E5A7D" },
    { lateral: "#100E24", lateralTexto: "#ECEAF7", activo: "#2A2650", fondo: "#14122B", superficie: "#1E1B3A", suave: "#2A2650", borde: "#3A3566", primario: "#6F6BC9", primarioClaro: "#B3B0EC", acento: "#F2A0BC", texto: "#ECEAF7", textoSecundario: "#A9A5C9" }),

  paleta("bosque", "Bosque",
    { lateral: "#2F4A3A", lateralTexto: "#FFFFFF", activo: "#1F3328", fondo: "#F6F8F5", superficie: "#FFFFFF", suave: "#DCE8DF", borde: "#D9E2DB", primario: "#3E6B4F", primarioClaro: "#7FA88D", acento: "#C9A35A", texto: "#18241D", textoSecundario: "#55665B" },
    { lateral: "#0D1612", lateralTexto: "#DCE8DF", activo: "#24402F", fondo: "#0F1A15", superficie: "#16241D", suave: "#1D3027", borde: "#2B4436", primario: "#4F8A64", primarioClaro: "#8CC2A0", acento: "#D8B46A", texto: "#E3EDE6", textoSecundario: "#A9BCAF" }),

  paleta("oceano", "Océano",
    { lateral: "#0F4C5C", lateralTexto: "#FFFFFF", activo: "#0A3540", fondo: "#F3F8F9", superficie: "#FFFFFF", suave: "#D3E9EE", borde: "#D2E2E6", primario: "#1A7A8C", primarioClaro: "#6FB3C1", acento: "#F2A65A", texto: "#0B2A33", textoSecundario: "#4F6D75" },
    { lateral: "#06171C", lateralTexto: "#D3E9EE", activo: "#124A57", fondo: "#081C22", superficie: "#0E2830", suave: "#13343D", borde: "#1F4A55", primario: "#1F8A9E", primarioClaro: "#5CC8DB", acento: "#F2A65A", texto: "#E2F1F4", textoSecundario: "#9FBFC6" }),

  paleta("menta", "Menta",
    { lateral: "#1E3A4C", lateralTexto: "#FFFFFF", activo: "#12283A", fondo: "#F4FAF8", superficie: "#FFFFFF", suave: "#D6F0E8", borde: "#D3E6E0", primario: "#2A8C7A", primarioClaro: "#7CC4B5", acento: "#F28C8C", texto: "#10232C", textoSecundario: "#4E6670" },
    { lateral: "#08141B", lateralTexto: "#D6F0E8", activo: "#1A4A42", fondo: "#0B1A20", superficie: "#12252D", suave: "#173038", borde: "#24434D", primario: "#2E9C87", primarioClaro: "#6FD6C0", acento: "#F28C8C", texto: "#E3F4EF", textoSecundario: "#A3C2BB" }),

  paleta("rosa-empolvado", "Rosa empolvado",
    { lateral: "#6B3E4E", lateralTexto: "#FFFFFF", activo: "#4E2A37", fondo: "#FBF6F7", superficie: "#FFFFFF", suave: "#F2DDE3", borde: "#ECDCE1", primario: "#9C5A6E", primarioClaro: "#C895A4", acento: "#7A9E9A", texto: "#2E1A21", textoSecundario: "#6E5560" },
    { lateral: "#1A0F13", lateralTexto: "#F2DDE3", activo: "#4E2A37", fondo: "#1E1216", superficie: "#2A1A20", suave: "#33212A", borde: "#4A3039", primario: "#A8657A", primarioClaro: "#E0A3B4", acento: "#8FBAB5", texto: "#F5E6EA", textoSecundario: "#C8AFB7" }),

  paleta("aurora", "Aurora",
    { lateral: "#1B2A4A", lateralTexto: "#FFFFFF", activo: "#0F1A33", fondo: "#F5F7FC", superficie: "#FFFFFF", suave: "#DDE6F7", borde: "#DCE2F0", primario: "#3557C4", primarioClaro: "#7F99E0", acento: "#3BC98F", texto: "#111B33", textoSecundario: "#535F7A" },
    { lateral: "#070B17", lateralTexto: "#DDE6F7", activo: "#1E2F6B", fondo: "#0A0F1F", superficie: "#10182E", suave: "#162140", borde: "#24315A", primario: "#4062D6", primarioClaro: "#7FA0FF", acento: "#3BC98F", texto: "#E5EBFA", textoSecundario: "#A6B2CF" }),

  paleta("grafito", "Grafito",
    { lateral: "#2E3138", lateralTexto: "#FFFFFF", activo: "#1C1E23", fondo: "#F7F7F8", superficie: "#FFFFFF", suave: "#E6E7EA", borde: "#E0E1E5", primario: "#3A3F4A", primarioClaro: "#8A909C", acento: "#4FA3C3", texto: "#1A1C20", textoSecundario: "#5C616B" },
    { lateral: "#0F1012", lateralTexto: "#E6E7EA", activo: "#2A2D33", fondo: "#121316", superficie: "#1A1C20", suave: "#23262B", borde: "#33363D", primario: "#4A505C", primarioClaro: "#6DB8D6", acento: "#6DB8D6", texto: "#ECEDEF", textoSecundario: "#A4A8B0" }),
];

export const PALETA_PREDETERMINADA = "syntra";

export const buscarPaleta = (id: string): Paleta => PALETAS.find((p) => p.id === id) ?? PALETAS[0];