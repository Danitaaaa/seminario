import iconoUpload from '../../assets/icons/upload.svg';
import iconoAddFolder from '../../assets/icons/add-folder.svg';
import { Icono } from '../comunes/icono';

interface MenuAgregarProps {
    abierto: boolean;
    onSubirArchivo: () => void;
    onCrearCarpeta: () => void;
}

// Solo se ocupa de mostrar las dos opciones cuando está abierto; quién controla
// el estado "abierto" y qué hace cada acción es responsabilidad del componente padre.
export function MenuAgregar({ abierto, onSubirArchivo, onCrearCarpeta }: MenuAgregarProps) {
    if (!abierto) return null;

    return (
        <div className="menu-agregar" role="menu">
            <button type="button" className="menu-agregar__opcion" onClick={onSubirArchivo}>
                <Icono src={iconoUpload} tamaño={18} />
                <span>Subir archivo</span>
            </button>
            <button type="button" className="menu-agregar__opcion" onClick={onCrearCarpeta}>
                <Icono src={iconoAddFolder} tamaño={18} />
                <span>Crear carpeta</span>
            </button>
        </div>
    );
}
