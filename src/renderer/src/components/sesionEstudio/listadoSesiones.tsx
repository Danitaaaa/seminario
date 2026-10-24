import type { KeyboardEvent, MouseEvent } from 'react';
import { BookOpen, CalendarClock } from 'lucide-react';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import type { VistaListado } from '../../types/vistaNodos';
import { EstadoBadge } from './estadoBadge';
import { MenuAccionesSesion } from './menuAccionesSesion';
import { formatearFecha } from '../../utils/formatearFecha';

interface ListadoSesionesProps {
  vista: VistaListado;
  sesiones: SesionEstudio[];
  seleccionadas: Set<number>;
  onSeleccionar: (sesion: SesionEstudio, evento: MouseEvent) => void;
  onAbrir: (sesion: SesionEstudio) => void;
  onConfigurar: (sesion: SesionEstudio) => void;
  onEliminar: (sesion: SesionEstudio) => void;
  onCrear: () => void;
}

// Lista o cuadrícula de sesiones, con la misma interacción que Material:
// un clic selecciona (Ctrl/Cmd suma, Shift elige un rango) y doble clic abre la sesión.
export function ListadoSesiones({
  vista, sesiones, seleccionadas, onSeleccionar, onAbrir, onConfigurar, onEliminar, onCrear,
}: ListadoSesionesProps) {
  if (sesiones.length === 0) {
    return (
      <div className="listado-sesiones__vacio">
        <p>Todavía no creaste ninguna sesión de estudio.</p>
        <button type="button" className="listado-sesiones__crear" onClick={onCrear}>+ Crear sesión de estudio</button>
      </div>
    );
  }

  const propsItem = (sesion: SesionEstudio) => ({
    role: 'row' as const,
    tabIndex: 0,
    'aria-selected': seleccionadas.has(sesion.idSesion),
    onClick: (e: MouseEvent) => onSeleccionar(sesion, e),
    onDoubleClick: () => onAbrir(sesion),
    onKeyDown: (e: KeyboardEvent) => e.key === 'Enter' && onAbrir(sesion),
  });

  const menu = (sesion: SesionEstudio) => (
    <MenuAccionesSesion
      onAbrir={() => onAbrir(sesion)}
      onConfigurar={() => onConfigurar(sesion)}
      onEliminar={() => onEliminar(sesion)}
    />
  );

  if (vista === 'cuadricula') {
    return (
      <div className="cuadricula-sesiones" role="grid">
        {sesiones.map((sesion) => (
          <div
            key={sesion.idSesion}
            className={`tarjeta-sesion${seleccionadas.has(sesion.idSesion) ? ' tarjeta-sesion--seleccionada' : ''}`}
            {...propsItem(sesion)}
          >
            <div className="tarjeta-sesion__superior">
              <span className="tarjeta-sesion__icono"><BookOpen size={18} /></span>
              {menu(sesion)}
            </div>
            <span className="tarjeta-sesion__nombre">{sesion.nombre}</span>
            <span className="tarjeta-sesion__materia">{sesion.materiaAsociada.nombre}</span>
            <span className="tarjeta-sesion__fecha"><CalendarClock size={13} /> {formatearFecha(sesion.fechaProgramada)}</span>
            <EstadoBadge estado={sesion.estado} pausada={sesion.pausada} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tabla-sesiones" role="table">
      <div className="tabla-sesiones__encabezado" role="row">
        <span>Nombre</span>
        <span>Materia</span>
        <span>Fecha programada</span>
        <span>Fecha creación</span>
        <span>Último acceso</span>
        <span>Estado</span>
        <span aria-hidden="true" />
      </div>
      {sesiones.map((sesion) => (
        <div
          key={sesion.idSesion}
          className={`tabla-sesiones__fila${seleccionadas.has(sesion.idSesion) ? ' tabla-sesiones__fila--seleccionada' : ''}`}
          {...propsItem(sesion)}
        >
          <span className="tabla-sesiones__nombre">{sesion.nombre}</span>
          <span className="tabla-sesiones__materia">{sesion.materiaAsociada.nombre}</span>
          <span>{formatearFecha(sesion.fechaProgramada)}</span>
          <span>{formatearFecha(sesion.fechaCreacion)}</span>
          <span>{formatearFecha(sesion.fechaUltimoAcceso)}</span>
          <span><EstadoBadge estado={sesion.estado} pausada={sesion.pausada} /></span>
          {menu(sesion)}
        </div>
      ))}
    </div>
  );
}
