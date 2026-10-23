import type { VistaListado } from '../types/vistaNodos';

const CLAVE = 'syntra:vista-listado';
const POR_DEFECTO: VistaListado = 'lista';

// Lee la última vista elegida. Si el navegador no deja leer, usa la vista por defecto.
export function leerVistaListado(): VistaListado {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === 'cuadricula' || valor === 'lista' ? valor : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
}

// Guarda la vista elegida para que siga igual al volver a Material.
export function guardarVistaListado(vista: VistaListado): void {
  try {
    localStorage.setItem(CLAVE, vista);
  } catch {
    // Sin almacenamiento disponible, la vista simplemente no se recuerda.
  }
}