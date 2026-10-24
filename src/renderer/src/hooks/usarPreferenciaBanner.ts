import { useEffect, useState } from "react";

export type FondoBanner = "paleta" | "imagen";

// Qué tarjetas pasan en el carrusel del banner de inicio.
export interface TarjetasBanner {
  clase: boolean;
  evento: boolean;
  metas: boolean;
}

const CLAVE_TARJETAS = "syntra:banner-tarjetas";
const CLAVE_AUTO = "syntra:banner-auto";
const CLAVE_FONDO = "syntra:banner-fondo";
const EVENTO = "syntra:banner-cambiado";

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

export function leerTarjetas(): TarjetasBanner {
  try {
    const valor = JSON.parse(leer(CLAVE_TARJETAS) ?? "{}");
    return { clase: valor.clase !== false, evento: valor.evento !== false, metas: valor.metas !== false };
  } catch {
    return { clase: true, evento: true, metas: true };
  }
}

export const leerAuto = (): boolean => leer(CLAVE_AUTO) !== "no";

export const leerFondo = (): FondoBanner => (leer(CLAVE_FONDO) === "imagen" ? "imagen" : "paleta");

// Cómo se ve el banner de inicio. Se elige en Ajustes y se comparte con el dashboard.
export function usarPreferenciaBanner() {
  const [tarjetas, setTarjetas] = useState(leerTarjetas);
  const [auto, setAuto] = useState(leerAuto);
  const [fondo, setFondo] = useState(leerFondo);

  useEffect(() => {
    const sincronizar = () => {
      setTarjetas(leerTarjetas());
      setAuto(leerAuto());
      setFondo(leerFondo());
    };
    window.addEventListener(EVENTO, sincronizar);
    return () => window.removeEventListener(EVENTO, sincronizar);
  }, []);

  return {
    tarjetas,
    auto,
    fondo,
    cambiarTarjeta: (tarjeta: keyof TarjetasBanner, valor: boolean) =>
      guardar(CLAVE_TARJETAS, JSON.stringify({ ...leerTarjetas(), [tarjeta]: valor })),
    cambiarAuto: (valor: boolean) => guardar(CLAVE_AUTO, valor ? "si" : "no"),
    cambiarFondo: (valor: FondoBanner) => guardar(CLAVE_FONDO, valor),
  };
}