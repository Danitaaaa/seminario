import iconoArrowUp from '../../assets/icons1/arrow-up.svg';
import iconoArrowDown from '../../assets/icons1/arrow-down.svg';
import { Icono } from '../comunes/icono';
import type { Direccion, OrdenarPor } from '../../types/vistaNodos';

interface ColumnaOrdenProps {
    etiqueta: string;
    // Si no se pasa campo (ej. "tipo", que no existe como columna ordenable en el
    // backend todavía), la pill se muestra pero no dispara ordenamiento.
    campo?: OrdenarPor;
    ordenActivo: OrdenarPor;
    direccion: Direccion;
    onOrdenar?: (campo: OrdenarPor) => void;
}

export function ColumnaOrden({ etiqueta, campo, ordenActivo, direccion, onOrdenar }: ColumnaOrdenProps) {
    const activa = campo !== undefined && campo === ordenActivo;
    const esOrdenable = campo !== undefined;

    return (
        <button
            type="button"
            className={`columna-orden${activa ? ' columna-orden--activa' : ''}`}
            disabled={!esOrdenable}
            onClick={() => campo && onOrdenar?.(campo)}
        >
            <span>{etiqueta}</span>
            {activa && <Icono src={direccion === 'ASC' ? iconoArrowUp : iconoArrowDown} tamaño={14} />}
        </button>
    );
}
