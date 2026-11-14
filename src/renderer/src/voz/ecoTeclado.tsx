import { useEffect } from 'react';
import { configurarLector, hablar, hayLector } from './narrador';

type Campo = HTMLInputElement | HTMLTextAreaElement;

const TIPOS_DE_TEXTO = ['text', 'search', 'email', 'password', 'tel', 'url', 'number'];

const NOMBRES: Record<string, string> = {
  '.': 'punto', ',': 'coma', '@': 'arroba', '-': 'guión', '_': 'guión bajo', '/': 'barra',
};

function esCampoDeTexto(el: EventTarget | null): el is Campo {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && TIPOS_DE_TEXTO.includes(el.type);
}

function esContrasena(campo: Campo): boolean {
  return campo instanceof HTMLInputElement && campo.type === 'password';
}

function nombreDelCampo(campo: Campo): string {
  return (
    campo.labels?.[0]?.textContent?.trim() ||
    campo.getAttribute('aria-label') ||
    campo.placeholder ||
    'Campo de texto'
  );
}

function nombreDeLetra(letra: string): string {
  if (NOMBRES[letra]) return NOMBRES[letra];
  if (letra !== letra.toLowerCase()) return `${letra} mayúscula`;
  return letra;
}

// En los campos email y number el navegador no da la posición del cursor: se asume el final.
function posicionCursor(campo: Campo): number {
  return campo.selectionStart ?? campo.value.length;
}

function palabraAnterior(campo: Campo): string {
  return campo.value.slice(0, posicionCursor(campo)).split(/\s+/).pop() ?? '';
}

function leerCampo(campo: Campo): void {
  const nombre = nombreDelCampo(campo);
  if (!campo.value) hablar(`${nombre}, vacío`);
  else if (esContrasena(campo)) hablar(`${nombre}, ${campo.value.length} caracteres`);
  else hablar(`${nombre}, ${campo.value}`);
}

// Lee en voz alta lo que se escribe en cualquier campo de la app.
// Si hay un lector de pantalla no hace nada: el lector ya tiene su propio eco.
export function EcoTeclado({ activo }: { activo: boolean }) {
  useEffect(() => {
    if (!activo) return;

    // Al entrar a un campo se vuelve a preguntar si hay lector:
    // Windows a veces avisa tarde que NVDA está prendido y Syntra hablaba encima.
    const alEnfocar = async (e: FocusEvent) => {
      const campo = e.target;
      if (!esCampoDeTexto(campo)) return;
      configurarLector(await window.api.lectorPantallaActivo().catch(() => hayLector()));
      if (!hayLector()) leerCampo(campo);
    };

    const alTeclear = (e: KeyboardEvent) => {
      if (hayLector() || !esCampoDeTexto(e.target)) return;
      const campo = e.target;
      const oculto = esContrasena(campo);

      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        leerCampo(campo);
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Backspace') {
        const borrada = campo.value[posicionCursor(campo) - 1];
        if (borrada) hablar(oculto ? 'Borrado' : `Borrado ${nombreDeLetra(borrada)}`);
      } else if (e.key === ' ') {
        const palabra = palabraAnterior(campo);
        hablar(oculto || !palabra ? 'Espacio' : palabra);
      } else if (e.key.length === 1) {
        hablar(oculto ? 'Asterisco' : nombreDeLetra(e.key));
      }
    };

    document.addEventListener('focusin', alEnfocar);
    document.addEventListener('keydown', alTeclear, true);
    return () => {
      document.removeEventListener('focusin', alEnfocar);
      document.removeEventListener('keydown', alTeclear, true);
    };
  }, [activo]);

  return null;
}