import { useEffect, useState } from "react";
import { aplicarTema } from "../styles/issue";
import type { Modo } from "../styles/temas/syntra";

export type PreferenciaModo = Modo | "sistema";

const CLAVE = "syntra:modo";
const EVENTO = "syntra:modo-cambiado";
const consultaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

export function leerPreferencia(): PreferenciaModo {
  try {
    const valor = localStorage.getItem(CLAVE);
    if (valor === "claro" || valor === "oscuro" || valor === "sistema") return valor;
  } catch {
    // Sin acceso a storage: queda el modo por defecto
  }
  return "claro";
}

const resolver = (preferencia: PreferenciaModo): Modo =>
  preferencia === "sistema" ? (consultaOscuro.matches ? "oscuro" : "claro") : preferencia;

export function aplicarPreferencia(): void {
  aplicarTema(resolver(leerPreferencia()));
}

export function usarModo() {
  const [preferencia, setPreferencia] = useState(leerPreferencia);

  useEffect(() => {
    const sincronizar = () => setPreferencia(leerPreferencia());
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

  function cambiar(nueva: PreferenciaModo): void {
    try {
      localStorage.setItem(CLAVE, nueva);
    } catch {
      // Si no se puede guardar, igual se aplica en esta sesión
    }
    aplicarPreferencia();
    window.dispatchEvent(new Event(EVENTO));
  }

  return { preferencia, modoActual: resolver(preferencia), cambiar };
}