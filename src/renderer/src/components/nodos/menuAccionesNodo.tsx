import iconoPencil from '../../assets/icons/pencil.svg';
import iconoTrash from '../../assets/icons/trash.svg';
import { Icono } from '../comunes/icono';
import { puede } from '../../permisos';
import type { RolMiembro } from '../../types/proyectos';

interface MenuAccionesNodoProps {
    abierto: boolean;
    onRenombrar: () => void;
    onEliminar: () => void;
    rol?: RolMiembro | null; // por defecto 'propietario' (material personal)
    nodoTipo?: 'archivo' | 'carpeta';
}

// Reutilizado tanto por la fila (vista lista) como por la tarjeta (vista cuadrícula):
// una sola definición de "qué acciones tiene un nodo", sin duplicar el menú dos veces.
export function MenuAccionesNodo({ abierto, onRenombrar, onEliminar, rol = 'propietario', nodoTipo = 'archivo' }: MenuAccionesNodoProps) {
    const puedeRenombrar = puede(rol, `${nodoTipo}.renombrar`);
    const puedeEliminar = puede(rol, `${nodoTipo}.eliminar`);
    if (!abierto || (!puedeRenombrar && !puedeEliminar)) return null;

    return (
        <div className="menu-acciones-nodo" role="menu">
            {puedeRenombrar && (
                <button type="button" className="menu-acciones-nodo__opcion" onClick={onRenombrar}>
                    <Icono src={iconoPencil} tamaño={16} />
                    <span>Renombrar</span>
                </button>
            )}
            {puedeEliminar && (
                <button type="button" className="menu-acciones-nodo__opcion menu-acciones-nodo__opcion--peligro" onClick={onEliminar}>
                    <Icono src={iconoTrash} tamaño={16} />
                    <span>Eliminar</span>
                </button>
            )}
        </div>
    );
}