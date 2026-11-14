// src/renderer/src/components/materialIA/indicadorIA.tsx
// Animación para mientras la IA trabaja ("Generando…", "Analizando…"): anillo que gira, chispa que late,
// puntos que parpadean y una barra que va y viene. Se ve igual en los modales y en las páginas.
import { Sparkles } from 'lucide-react';
import '../../styles/indicadorIA.css';

interface Props {
  /** Lo principal: "Generando flashcards", "Analizando el plan"… (los puntos animados se suman solos). */
  mensaje: string;
  /** Línea chica de abajo: "Archivo 2 de 3", "Puede tardar un poco…". */
  detalle?: string;
}

export function IndicadorIA({ mensaje, detalle }: Props) {
  return (
    <div className="indicador-ia" role="status" aria-live="polite">
      <div className="indicador-ia__orbita" aria-hidden="true">
        <span className="indicador-ia__anillo" />
        <Sparkles className="indicador-ia__chispa" size={26} />
      </div>
      <p className="indicador-ia__mensaje">
        {mensaje}
        <span className="indicador-ia__puntos" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      </p>
      {detalle && <p className="indicador-ia__detalle">{detalle}</p>}
      <div className="indicador-ia__barra" aria-hidden="true"><span /></div>
    </div>
  );
}