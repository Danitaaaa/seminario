import { useEffect } from 'react';
import { modoVozActivo } from './narrador';

// Con modo voz, los grupos con muchos botones (menú, tarjetas del inicio, calendarios) se recorren
// con las flechas, y Tab salta el grupo entero: así no hay que apretar Tab mil veces para salir.
const GRUPOS = '.app-lateral__grupo, .dashboard__modulos, .calendario__grilla, .eventos-grilla, [data-voz-grupo]';
// En las grillas de calendario, arriba y abajo mueven una semana.
const GRILLAS_SEMANA = '.calendario__grilla, .eventos-grilla';
const ENFOCABLES = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

function enfocables(raiz: ParentNode): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(
    (el) => el.tabIndex >= 0 && el.offsetParent !== null && !el.closest('[aria-hidden="true"]'),
  );
}

const escribiendo = (el: HTMLElement) =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable;

export function NavegacionFlechas() {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (!modoVozActivo() || e.altKey || e.ctrlKey) return;
      const actual = document.activeElement as HTMLElement | null;
      if (!actual || escribiendo(actual)) return;
      const grupo = actual.closest<HTMLElement>(GRUPOS);
      if (!grupo) return;

      if (e.key === 'Tab') {
        // Salta al primer elemento después del grupo (o al último antes, con Shift+Tab).
        const todos = enfocables(document);
        const delGrupo = enfocables(grupo);
        if (delGrupo.length === 0) return;
        const destino = e.shiftKey
          ? todos.slice(0, todos.indexOf(delGrupo[0])).pop()
          : todos.slice(todos.indexOf(delGrupo[delGrupo.length - 1]) + 1)[0];
        if (!destino) return;
        e.preventDefault();
        destino.focus();
        return;
      }

      const paso = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!paso) return;
      const items = enfocables(grupo);
      const salto = grupo.matches(GRILLAS_SEMANA) && (e.key === 'ArrowDown' || e.key === 'ArrowUp') ? 7 : 1;
      const siguiente = items[items.indexOf(actual) + paso * salto];
      e.preventDefault();
      siguiente?.focus();
    };

    document.addEventListener('keydown', alTeclear, true);
    return () => document.removeEventListener('keydown', alTeclear, true);
  }, []);

  return null;
}
