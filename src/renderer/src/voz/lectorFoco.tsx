import { useEffect } from 'react';
import { hablar, hayLector } from './narrador';

const ROLES: Record<string, string> = { BUTTON: 'botón', A: 'enlace', SELECT: 'lista desplegable' };

// Los lee EcoTeclado. El main recibe el foco al cambiar de pantalla y no se lee entero.
const NO_LEER = 'main, textarea, input:not([type=checkbox]):not([type=radio])';

function nombreAccesible(el: HTMLElement): string {
  const etiqueta = el instanceof HTMLInputElement ? el.labels?.[0]?.textContent : null;
  const nombre = el.getAttribute('aria-label') || etiqueta || el.querySelector('img')?.alt || el.textContent || '';
  return nombre.replace(/\s+/g, ' ').trim();
}

// Con la voz de Syntra (sin NVDA), dice a qué elemento se llegó con Tab:
// "Carpeta Comunicación de datos", "PDF Apunte 1", "Volver, botón".
// Los campos de texto los lee EcoTeclado.
export function LectorFoco() {
  useEffect(() => {
    const alEnfocar = (e: FocusEvent) => {
      const el = e.target;
      if (hayLector() || !(el instanceof HTMLElement) || el.matches(NO_LEER)) return;

      const nombre = nombreAccesible(el);
      if (!nombre) return;
      if (el instanceof HTMLInputElement) {
        hablar(`${nombre}, ${el.checked ? 'marcada' : 'sin marcar'}`);
        return;
      }
      const rol = ROLES[el.tagName];
      hablar(rol ? `${nombre}, ${rol}` : nombre);
    };

    document.addEventListener('focusin', alEnfocar);
    return () => document.removeEventListener('focusin', alEnfocar);
  }, []);

  return null;
}
