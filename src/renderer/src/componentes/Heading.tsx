import { ReactNode } from 'react';
import { colors } from '../estilos/colors';
import { typography } from '../estilos/typography';

interface HeadingProps {
  level?: 2 | 3;
  children: ReactNode;
}

// Un solo lugar decide cómo se ve un título en toda la app.
// Si mañana cambia la paleta, se edita acá — no en cada pantalla.
export function Heading({ level = 2, children }: HeadingProps) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag
      style={{
        color: colors.primary,
        fontFamily: typography.fontFamily.display,
        fontSize: level === 2 ? typography.fontSize.xl : typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        margin: 0,
      }}
    >
      {children}
    </Tag>
  );
}