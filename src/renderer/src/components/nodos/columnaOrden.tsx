import iconoArrowUp from '../../assets/icons/arrow-up.svg';
import iconoArrowDown from '../../assets/icons/arrow-down.svg';
import { Icono } from '../comunes/icono';
import type { Direccion, OrdenarPor } from '../../types/vistaNodos';

// Genérico en el campo para poder reutilizarlo en otras listas (ej. sesiones de estudio).
interface ColumnaOrdenProps<T extends string = OrdenarPor> {
    etiqueta: string;
    campo?: T;
    ordenActivo: T;
    direccion: Direccion;
    onOrdenar?: (campo: T) => void;
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
