import { Icono } from './icono';

interface IconoAccionProps {
    icono: string;
    alt: string;
    activo?: boolean;
    deshabilitado?: boolean;
    onClick?: () => void;
}

// Reutilizable para cualquier botón que solo muestra un ícono: toggles de vista,
// acciones puntuales (eliminar, ordenar) o disparadores de menú.
// Si más adelante existe un botonIcono.tsx de uso general en comunes/, este
// componente puede reemplazarse por ese sin tocar quien lo usa (misma interfaz).
export function IconoAccion({ icono, alt, activo = false, deshabilitado = false, onClick }: IconoAccionProps) {
    return (
        <button
            type="button"
            className={`icono-accion${activo ? ' icono-accion--activo' : ''}`}
            onClick={onClick}
            disabled={deshabilitado}
            aria-pressed={activo}
            aria-label={alt}
            title={alt}
        >
            <Icono src={icono} alt={alt} tamaño={18} />
        </button>
    );
}
