import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Timer, CalendarClock, Lightbulb, FolderKanban, CalendarDays, type LucideIcon,
} from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { MiniCalendario } from './miniCalendario';
import '../../styles/dashboard.css';

type Modulo = {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: LucideIcon;
  tono: string;
};

// El tono de cada portada se define en dashboard.css.
const MODULOS: Modulo[] = [
  { titulo: 'Material', descripcion: '¡Administrá tus apuntes, bibliografía y demás!', ruta: '/material', icono: BookOpen, tono: 'material' },
  { titulo: 'Sesiones de estudio', descripcion: 'Ingresá a las sesiones de estudio para una mejor concentración.', ruta: '/proximamente/sesiones', icono: Timer, tono: 'sesiones' },
  { titulo: 'Horarios', descripcion: 'Horarios de cursado.', ruta: '/horarios', icono: CalendarClock, tono: 'horarios' },
  { titulo: 'Métodos', descripcion: 'Creá tus métodos para tus sesiones de estudio.', ruta: '/proximamente/metodos', icono: Lightbulb, tono: 'metodos' },
  { titulo: 'Proyectos', descripcion: 'Visualizá tus proyectos creados.', ruta: '/proximamente/proyectos', icono: FolderKanban, tono: 'proyectos' },
  { titulo: 'Cronograma', descripcion: 'Visualización del calendario y listado de actividad.', ruta: '/proximamente/cronograma', icono: CalendarDays, tono: 'cronograma' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <PlantillaLayout titulo="Dashboard" idActivo="inicio" usuario={{ nombre: 'Usuario' }}>
      <div className="dashboard">
        <div className="dashboard__modulos">
          {MODULOS.map(({ titulo, descripcion, ruta, icono: Icono, tono }) => (
            <button key={titulo} type="button" className="dashboard__tarjeta" onClick={() => navigate(ruta)}>
              <div className={`dashboard__portada dashboard__portada--${tono}`}>
                <Icono size={32} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="dashboard__texto">
                <h3 className="dashboard__titulo">{titulo}</h3>
                <p className="dashboard__descripcion">{descripcion}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="dashboard__lateral">
          <MiniCalendario />
        </div>
      </div>
    </PlantillaLayout>
  );
}