import { useState } from "react";

export type EstiloTarjeta = "simple" | "ondas" | "esquinas" | "diagonales" | "puntos";

export const ESTILOS_TARJETA: { valor: EstiloTarjeta; etiqueta: string }[] = [
  { valor: "simple", etiqueta: "Simple" },
  { valor: "ondas", etiqueta: "Ondas" },
  { valor: "esquinas", etiqueta: "Esquinas" },
  { valor: "diagonales", etiqueta: "Diagonales" },
  { valor: "puntos", etiqueta: "Puntos" },
];

const CLAVE = "syntra:flashcards-estilo";

function leerEstilo(): EstiloTarjeta {
  try {
    const valor = localStorage.getItem(CLAVE);
    return ESTILOS_TARJETA.some((e) => e.valor === valor) ? (valor as EstiloTarjeta) : "simple";
  } catch {
    return "simple";
  }
}

// Cómo se dibuja la tarjeta al estudiar. Se recuerda para la próxima vez.
export function usarEstiloFlashcards() {
  const [estilo, setEstilo] = useState(leerEstilo);

  const cambiarEstilo = (valor: EstiloTarjeta) => {
    setEstilo(valor);
    try {
      localStorage.setItem(CLAVE, valor);
    } catch {
      // Si no se puede guardar, igual se aplica mientras estudia
    }
  };

  return { estilo, cambiarEstilo };
}