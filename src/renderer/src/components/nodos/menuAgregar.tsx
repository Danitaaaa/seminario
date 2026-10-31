import iconoUpload from '../../assets/icons/upload.svg';
import iconoAddFolder from '../../assets/icons/add-folder.svg';
import { Icono } from '../comunes/icono';
import { puede } from '../../permisos';
import type { RolMiembro } from '../../types/proyectos';

interface MenuAgregarProps {
    abierto: boolean;
    onSubirArchivo: () => void;
    onCrearCarpeta: () => void;
    rol?: RolMiembro | null; // por defecto 'propietario' (material personal)
}

// Solo se ocupa de mostrar las opciones permitidas cuando está abierto; quién controla
// el estado "abierto" y qué hace cada acción es responsabilidad del componente padre.
export function MenuAgregar({ abierto, onSubirArchivo, onCrearCarpeta, rol = 'propietario' }: MenuAgregarProps) {
    const puedeSubir = puede(rol, 'archivo.subir');
    const puedeCarpeta = puede(rol, 'carpeta.crear');
    if (!abierto || (!puedeSubir && !puedeCarpeta)) return null;

    return (
        <div className="menu-agregar" role="menu">
            {puedeSubir && (
                <button type="button" className="menu-agregar__opcion" onClick={onSubirArchivo}>
                    <Icono src={iconoUpload} tamaño={18} />
                    <span>Subir archivo</span>
                </button>
            )}
            {puedeCarpeta && (
                <button type="button" className="menu-agregar__opcion" onClick={onCrearCarpeta}>
                    <Icono src={iconoAddFolder} tamaño={18} />
                    <span>Crear carpeta</span>
                </button>
            )}
        </div>
    );
}