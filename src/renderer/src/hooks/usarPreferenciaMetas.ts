import { useEffect, useState } from "react";

export type EstiloMetas = "completa" | "minimalista" | "cuaderno";

// Qué se muestra en el estilo completo.
export interface MostrarMetas {
  fechas: boolean;
  contador: boolean;
  progreso: boolean;
}

const CLAVE_VISIBLE = "syntra:metas-visible";
const CLAVE_ESTILO = "syntra:metas-estilo";
const CLAVE_MOSTRAR = "syntra:metas-mostrar";
const EVENTO = "syntra:metas-cambiadas";

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Si no se puede guardar, igual se aplica en esta sesión
  }
  window.dispatchEvent(new Event(EVENTO));
}

// Las metas se ven salvo que el usuario las haya ocultado.
export function leerVisible(): boolean {
  return leer(CLAVE_VISIBLE) !== "no";
}

export function leerEstilo(): EstiloMetas {
  const valor = leer(CLAVE_ESTILO);
  return valor === "minimalista" || valor === "cuaderno" ? valor : "completa";
}

export function leerMostrar(): MostrarMetas {
  try {
    const valor = JSON.parse(leer(CLAVE_MOSTRAR) ?? "{}");
    return {
      fechas: valor.fechas !== false,
      contador: valor.contador !== false,
      progreso: valor.progreso !== false,
    };
  } catch {
    return { fechas: true, contador: true, progreso: true };
  }
}

// Cómo se ven las metas del inicio. Se elige en Ajustes y se comparte con el dashboard.
export function usarPreferenciaMetas() {
  const [visible, setVisible] = useState(leerVisible);
  const [estilo, setEstilo] = useState(leerEstilo);
  const [mostrar, setMostrar] = useState(leerMostrar);

  useEffect(() => {
    const sincronizar = () => {
      setVisible(leerVisible());
      setEstilo(leerEstilo());
      setMostrar(leerMostrar());
    };
    window.addEventListener(EVENTO, sincronizar);
    return () => window.removeEventListener(EVENTO, sincronizar);
  }, []);

  return {
    visible,
    estilo,
    mostrar,
    cambiarVisible: (valor: boolean) => guardar(CLAVE_VISIBLE, valor ? "si" : "no"),
    cambiarEstilo: (nuevo: EstiloMetas) => guardar(CLAVE_ESTILO, nuevo),
    cambiarMostrar: (opcion: keyof MostrarMetas, valor: boolean) =>
      guardar(CLAVE_MOSTRAR, JSON.stringify({ ...leerMostrar(), [opcion]: valor })),
  };
}