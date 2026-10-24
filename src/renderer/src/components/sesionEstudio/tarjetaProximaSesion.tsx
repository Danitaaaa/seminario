import { useNavigate } from 'react-router-dom';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import { formatearDiaHora } from '../../pages/sesionesEstudio/utilidades';

interface TarjetaProximaSesionProps {
  sesion: SesionEstudio | null;
  cargando: boolean;
}

// Contenido de la tarjeta "Próxima sesión": la próxima sesión sin empezar, o un aviso si no hay.
export function TarjetaProximaSesion({ sesion, cargando }: TarjetaProximaSesionProps) {
  const navigate = useNavigate();

  if (cargando) return <p className="proxima__vacia">Buscando tu próxima sesión…</p>;

  if (!sesion) {
    return (
      <div className="proxima proxima--vacia">
        <p className="proxima__titulo">No hay próximas sesiones</p>
        <p className="proxima__texto">Cuando programes otra sesión de estudio va a aparecer acá.</p>
        <button type="button" className="proxima__enlace" onClick={() => navigate('/sesiones/nueva')}>
          + Programar una sesión
        </button>
      </div>
    );
  }

  const objetivos = sesion.objetivos.map((o) => o.descripcion).join(', ');
  return (
    <button type="button" className="proxima" onClick={() => navigate(`/sesiones/${sesion.idSesion}`)}>
      <span className="proxima__titulo">Próxima sesión de {sesion.materiaAsociada.nombre}</span>
      <span className="proxima__fecha">{formatearDiaHora(sesion.fechaProgramada)}</span>
      <span className="proxima__texto">
        {sesion.nombre}
        {objetivos ? `: ${objetivos}.` : ` · ${sesion.duracion} min.`}
      </span>
    </button>
  );
}
