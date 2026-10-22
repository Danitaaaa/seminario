import { useEffect, useState } from "react";
import { aplicarTema } from "../styles/issue";
import type { Modo } from "../styles/temas/syntra";
import { PALETAS, PALETA_PREDETERMINADA } from "../styles/temas/paletas";

export type PreferenciaModo = Modo | "sistema";

const CLAVE_MODO = "syntra:modo";
const CLAVE_PALETA = "syntra:paleta";
const EVENTO = "syntra:apariencia-cambiada";
const consultaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

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
}

export function leerPreferencia(): PreferenciaModo {
  const valor = leer(CLAVE_MODO);
  return valor === "claro" || valor === "oscuro" || valor === "sistema" ? valor : "claro";
}

export function leerPaleta(): string {
  const valor = leer(CLAVE_PALETA);
  return valor && PALETAS.some((p) => p.id === valor) ? valor : PALETA_PREDETERMINADA;
}

const resolver = (preferencia: PreferenciaModo): Modo =>
  preferencia === "sistema" ? (consultaOscuro.matches ? "oscuro" : "claro") : preferencia;

export function aplicarPreferencia(): void {
  aplicarTema(resolver(leerPreferencia()), leerPaleta());
}

// Modo y paleta compartidos entre el botón sol/luna y Ajustes.
export function usarModo() {
  const [preferencia, setPreferencia] = useState(leerPreferencia);
  const [paleta, setPaleta] = useState(leerPaleta);

  useEffect(() => {
    const sincronizar = () => {
      setPreferencia(leerPreferencia());
      setPaleta(leerPaleta());
    };
    const alCambiarSistema = () => {
      if (leerPreferencia() === "sistema") aplicarPreferencia();
    };
    window.addEventListener(EVENTO, sincronizar);
    consultaOscuro.addEventListener("change", alCambiarSistema);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      consultaOscuro.removeEventListener("change", alCambiarSistema);
    };
  }, []);

  function actualizar(clave: string, valor: string): void {
    guardar(clave, valor);
    aplicarPreferencia();
    window.dispatchEvent(new Event(EVENTO));
  }

  return {
    preferencia,
    modoActual: resolver(preferencia),
    paleta,
    cambiar: (nueva: PreferenciaModo) => actualizar(CLAVE_MODO, nueva),
    cambiarPaleta: (id: string) => actualizar(CLAVE_PALETA, id),
  };
}