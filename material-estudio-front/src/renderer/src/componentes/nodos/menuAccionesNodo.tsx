import iconoPencil from '../../assets/icons1/pencil.svg';
import iconoTrash from '../../assets/icons1/trash.svg';
import { Icono } from '../comunes/icono';

interface MenuAccionesNodoProps {
    abierto: boolean;
    onRenombrar: () => void;
    onEliminar: () => void;
}

// Reutilizado tanto por la fila (vista lista) como por la tarjeta (vista cuadrícula):
// una sola definición de "qué acciones tiene un nodo", sin duplicar el menú dos veces.
export function MenuAccionesNodo({ abierto, onRenombrar, onEliminar }: MenuAccionesNodoProps) {
    if (!abierto) return null;

    return (
        <div className="menu-acciones-nodo" role="menu">
            <button type="button" className="menu-acciones-nodo__opcion" onClick={onRenombrar}>
                <Icono src={iconoPencil} tamaño={16} />
                <span>Renombrar</span>
            </button>
            <button type="button" className="menu-acciones-nodo__opcion menu-acciones-nodo__opcion--peligro" onClick={onEliminar}>
                <Icono src={iconoTrash} tamaño={16} />
                <span>Eliminar</span>
            </button>
        </div>
    );
}
