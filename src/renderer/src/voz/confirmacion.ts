import { hablar } from './narrador';

let pendiente: ((si: boolean) => void) | null = null;

// Pregunta algo y espera sí o no.
// Hoy se responde con Tab (sí) o Escape (no); el reconocimiento de voz va a llamar a responderConfirmacion.
export function confirmar(pregunta: string): Promise<boolean> {
  responderConfirmacion(false); // si había otra pregunta abierta, se cancela

  hablar(`${pregunta} Decí sí o no. También podés apretar Tab para sí o Escape para no.`);

  return new Promise((resolver) => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      responderConfirmacion(e.key === 'Tab');
    };

    pendiente = (si) => {
      document.removeEventListener('keydown', alTeclear, true);
      pendiente = null;
      hablar(si ? 'Confirmado' : 'Cancelado');
      resolver(si);
    };

    document.addEventListener('keydown', alTeclear, true);
  });
}

export function responderConfirmacion(si: boolean): void {
  pendiente?.(si);
}

export function hayConfirmacionPendiente(): boolean {
  return pendiente !== null;
}
