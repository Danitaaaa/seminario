import { useState } from "react";
import type { PosicionImagen } from "./usarArrastreImagen";

const CENTRO: PosicionImagen = { x: 50, y: 50 };
const clave = (idProyecto: number) => `syntra:portada-posicion:${idProyecto}`;

function leer(idProyecto: number): PosicionImagen {
  try {
    const valor = JSON.parse(localStorage.getItem(clave(idProyecto)) ?? "null");
    if (typeof valor?.x === "number" && typeof valor?.y === "number") return valor;
  } catch {
    // Si no se puede leer, se usa el centro
  }
  return CENTRO;
}

// Qué parte de la portada de un proyecto se ve. Es de esta compu, igual que la imagen.
export function usarPosicionPortada(idProyecto: number) {
  const [posicion, setPosicion] = useState(() => leer(idProyecto));

  const cambiarPosicion = (nueva: PosicionImagen) => {
    setPosicion(nueva);
    try {
      localStorage.setItem(clave(idProyecto), JSON.stringify(nueva));
    } catch {
      // Si no se puede guardar, igual se aplica en esta sesión
    }
  };

  return { posicion, cambiarPosicion, centrar: () => cambiarPosicion(CENTRO) };
}