import type { ReactNode } from 'react';

interface AnilloProgresoProps {
  // De 0 a 1: parte del anillo que se pinta con el color de relleno.
  progreso: number;
  tamaño?: number;
  grosor?: number;
  claseRelleno?: string;
  clasePista?: string;
  children?: ReactNode;
}

// Anillo circular de progreso (Pomodoro y cartel de bienvenida). El contenido va centrado adentro.
// Los colores salen del CSS (clases), así se mantienen en los archivos de estilos.
export function AnilloProgreso({
  progreso,
  tamaño = 180,
  grosor = 18,
  claseRelleno = 'anillo__relleno',
  clasePista = 'anillo__pista',
  children,
}: AnilloProgresoProps) {
  const radio = (tamaño - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const acotado = Math.min(1, Math.max(0, progreso));

  return (
    <div className="anillo" style={{ width: tamaño, height: tamaño }}>
      <svg width={tamaño} height={tamaño} viewBox={`0 0 ${tamaño} ${tamaño}`} aria-hidden="true">
        <circle className={clasePista} cx={tamaño / 2} cy={tamaño / 2} r={radio} strokeWidth={grosor} fill="none" />
        <circle
          className={claseRelleno}
          cx={tamaño / 2}
          cy={tamaño / 2}
          r={radio}
          strokeWidth={grosor}
          fill="none"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - acotado)}
          transform={`rotate(-90 ${tamaño / 2} ${tamaño / 2})`}
        />
      </svg>
      <div className="anillo__centro">{children}</div>
    </div>
  );
}
