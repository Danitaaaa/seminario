import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Timer, CalendarClock, Lightbulb, FolderKanban, CalendarDays, type LucideIcon,
} from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { MiniCalendario } from './miniCalendario';
import { colors } from '../../estilos/colors';
import { typography } from '../../estilos/typography';
import { spacing } from '../../estilos/spacing';

type Modulo = {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: LucideIcon;
  fondo: string;
  color: string;
};

// Fondos: tonos claros de Moonlight / Frost Blue / Steel. Íconos: Steel, Storm, Oxford Blue.
// Fondos: tonos claros de Frost Blue y Steel. Íconos: Steel, Storm, Oxford Blue.
const MODULOS: Modulo[] = [
  { titulo: 'Material', descripcion: '¡Administrá tus apuntes, bibliografía y demás!', ruta: '/material', icono: BookOpen, fondo: '#E3E9F2', color: '#495B7D' },
  { titulo: 'Sesiones de estudio', descripcion: 'Ingresá a las sesiones de estudio para una mejor concentración.', ruta: '/proximamente/sesiones', icono: Timer, fondo: '#C5D1E2', color: '#23354D' },
  { titulo: 'Horarios', descripcion: 'Horarios de cursado y colectivos.', ruta: '/proximamente/horarios', icono: CalendarClock, fondo: '#D1DBE8', color: '#23354D' },
  { titulo: 'Métodos', descripcion: 'Creá tus métodos para tus sesiones de estudio.', ruta: '/proximamente/metodos', icono: Lightbulb, fondo: '#B8C8DC', color: '#02122F' },
  { titulo: 'Proyectos', descripcion: 'Visualizá tus proyectos creados.', ruta: '/proximamente/proyectos', icono: FolderKanban, fondo: '#DADEE6', color: '#495B7D' },
  { titulo: 'Cronograma', descripcion: 'Visualización del calendario y listado de actividad.', ruta: '/proximamente/cronograma', icono: CalendarDays, fondo: '#A9BCD4', color: '#02122F' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <PlantillaLayout titulo="Dashboard" idActivo="inicio" usuario={{ nombre: 'Usuario' }}>
      <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start', padding: spacing.lg }}>
        <div style={estiloGrillaModulos}>
          {MODULOS.map(({ titulo, descripcion, ruta, icono: Icono, fondo, color }) => (
            <button key={titulo} onClick={() => navigate(ruta)} style={estiloTarjeta}>
              <div style={{ ...estiloPortada, background: fondo, color }}>
                <Icono size={32} strokeWidth={1.75} />
              </div>
              <div style={{ padding: spacing.sm, textAlign: 'left' }}>
                <h3 style={estiloTitulo}>{titulo}</h3>
                <p style={estiloDescripcion}>{descripcion}</p>
              </div>
            </button>
          ))}
        </div>

        <div style={{ width: 260, flexShrink: 0 }}>
          <MiniCalendario />
        </div>
      </div>
    </PlantillaLayout>
  );
}

const estiloGrillaModulos: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: spacing.md,
};

const estiloTarjeta: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  height: 110,
  padding: 0,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  overflow: 'hidden',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
};

const estiloPortada: React.CSSProperties = {
  width: 110,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const estiloTitulo: React.CSSProperties = {
  margin: 0,
  marginBottom: spacing.xs,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.base,
  fontWeight: typography.fontWeight.bold,
  color: colors.textPrimary,
};

const estiloDescripcion: React.CSSProperties = {
  margin: 0,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
};