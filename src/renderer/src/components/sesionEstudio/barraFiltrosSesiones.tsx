import iconoTrash from '../../assets/icons/trash.svg';
import iconoGrid from '../../assets/icons/grid.svg';
import iconoList from '../../assets/icons/list.svg';
import { IconoAccion } from '../comunes/iconoAccion';
import { Boton } from '../comunes/boton';
import { ColumnaOrden } from '../nodos/columnaOrden';
import type { Direccion, VistaListado } from '../../types/vistaNodos';
import type { OrdenSesiones } from '../../pages/sesionesEstudio/utilidades';

const COLUMNAS: { etiqueta: string; campo: OrdenSesiones }[] = [
  { etiqueta: 'Nombre', campo: 'nombre' },
  { etiqueta: 'Materia', campo: 'materia' },
  { etiqueta: 'Fecha programada', campo: 'fecha_programada' },
  { etiqueta: 'Fecha creación', campo: 'fecha_creacion' },
  { etiqueta: 'Último acceso', campo: 'fecha_ultimo_acceso' },
  { etiqueta: 'Estado', campo: 'estado' },
];

interface BarraFiltrosSesionesProps {
  ordenActivo: OrdenSesiones;
  direccion: Direccion;
  onOrdenar: (campo: OrdenSesiones) => void;
  vista: VistaListado;
  onCambiarVista: (vista: VistaListado) => void;
  haySeleccion: boolean;
  onEliminarSeleccion: () => void;
  onCrear: () => void;
}

// Barra de la lista de sesiones, igual a la de Material: ordenar por columna, eliminar
// lo seleccionado y cambiar entre cuadrícula y lista. Mantiene el botón "+ Crear sesión de estudio".
export function BarraFiltrosSesiones({
  ordenActivo, direccion, onOrdenar, vista, onCambiarVista, haySeleccion, onEliminarSeleccion, onCrear,
}: BarraFiltrosSesionesProps) {
  return (
    <div className="barra-filtros">
      <div className="barra-filtros__columnas">
        {COLUMNAS.map((c) => (
          <ColumnaOrden<OrdenSesiones>
            key={c.campo}
            etiqueta={c.etiqueta}
            campo={c.campo}
            ordenActivo={ordenActivo}
            direccion={direccion}
            onOrdenar={onOrdenar}
          />
        ))}
      </div>

      <div className="barra-filtros__acciones">
        <Boton onClick={onCrear}>+ Crear sesión de estudio</Boton>
        <IconoAccion icono={iconoTrash} alt="Eliminar seleccionadas" deshabilitado={!haySeleccion} onClick={onEliminarSeleccion} />
        <IconoAccion icono={iconoGrid} alt="Ver en cuadrícula" activo={vista === 'cuadricula'} onClick={() => onCambiarVista('cuadricula')} />
        <IconoAccion icono={iconoList} alt="Ver en lista" activo={vista === 'lista'} onClick={() => onCambiarVista('lista')} />
      </div>
    </div>
  );
}
