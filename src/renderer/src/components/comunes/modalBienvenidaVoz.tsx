import { useEffect } from 'react';
import { useVoice } from '../../hooks/useVoice';
import { hablar } from '../../utils/hablar';

// Al abrir Syntra por primera vez, la voz de Syntra pregunta si se usa con voz (no hay nada escrito).
export function ModalBienvenidaVoz() {
  const { modoVoz, responderModoVoz } = useVoice();

  useEffect(() => {
    if (modoVoz !== null) return;
    // Se avisa antes de NVDA: si no se lo duerme, lee todo encima de Syntra.
    hablar(
      'Si tenés NVDA prendido, activá el modo silencioso con Insert más Shift más S. ' +
        '¿Querés usar Syntra con la voz? Apretá Espacio o decí sí. Escape para no.',
    );

    const alPresionar = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== 'Escape') return;
      event.preventDefault();
      responderModoVoz(event.code === 'Space');
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [modoVoz, responderModoVoz]);

  return null;
}
