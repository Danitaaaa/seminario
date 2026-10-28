import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { separarFormulas } from '../../utils/formulas';

interface TextoConFormulasProps {
  texto: string;
  className?: string;
}

// Muestra un texto con fórmulas LaTeX ($…$, $$…$$, \(…\), \[…\]) ya dibujadas.
// Si una fórmula tiene un error se ve en rojo, sin romper el resto del texto.
export function TextoConFormulas({ texto, className }: TextoConFormulasProps) {
  const trozos = useMemo(() => separarFormulas(texto), [texto]);

  return (
    <span className={className}>
      {trozos.map((trozo, i) =>
        trozo.tipo === 'texto' ? (
          <span key={i}>{trozo.contenido}</span>
        ) : (
          <span
            key={i}
            // KaTeX genera el HTML de la fórmula a partir del LaTeX y escapa el texto (trust: false).
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(trozo.contenido, { displayMode: trozo.bloque, throwOnError: false }),
            }}
          />
        )
      )}
    </span>
  );
}
