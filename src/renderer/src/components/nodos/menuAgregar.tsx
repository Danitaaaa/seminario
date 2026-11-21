import iconoUpload from '../../assets/icons/upload.svg';
import iconoAddFolder from '../../assets/icons/add-folder.svg';
import iconoArchivoTexto from '../../assets/icons/file-text.svg';
import iconoNota from '../../assets/icons/note.svg';
import { Icono } from '../comunes/icono';
import { puede } from '../../permisos';
import type { RolMiembro } from '../../types/proyectos';

interface MenuAgregarProps {
    abierto: boolean;
    onSubirArchivo: () => void;
    onSubirCarpeta: () => void;
    onCrearCarpeta: () => void;
    onCrearDocumento?: (tipo: 'docx' | 'txt') => void;
    onCrearNota?: () => void;
    rol?: RolMiembro | null; // por defecto 'propietario' (material personal)
}

// Solo se ocupa de mostrar las opciones permitidas cuando está abierto; quién controla
// el estado "abierto" y qué hace cada acción es responsabilidad del componente padre.
export function MenuAgregar({ abierto, onSubirArchivo, onSubirCarpeta, onCrearCarpeta, onCrearDocumento, onCrearNota, rol = 'propietario' }: MenuAgregarProps) {
    const puedeSubir = puede(rol, 'archivo.subir');
    const puedeCarpeta = puede(rol, 'carpeta.crear');
    if (!abierto || (!puedeSubir && !puedeCarpeta)) return null;

    return (
        <div className="menu-agregar" role="menu">
            {puedeSubir && onCrearDocumento && (
                <>
                    <button type="button" className="menu-agregar__opcion" onClick={() => onCrearDocumento('docx')}>
                        <Icono src={iconoArchivoTexto} tamaño={18} />
                        <span>Documento de Word</span>
                    </button>
                    <button type="button" className="menu-agregar__opcion" onClick={() => onCrearDocumento('txt')}>
                        <Icono src={iconoArchivoTexto} tamaño={18} />
                        <span>Archivo de texto</span>
                    </button>
                </>
            )}
            {onCrearNota && (
                <button type="button" className="menu-agregar__opcion" onClick={onCrearNota}>
                    <Icono src={iconoNota} tamaño={18} />
                    <span>Nota rápida</span>
                </button>
            )}
            {(onCrearDocumento || onCrearNota) && <div className="menu-agregar__separador" role="separator" />}
            {puedeSubir && (
                <button type="button" className="menu-agregar__opcion" onClick={onSubirArchivo}>
                    <Icono src={iconoUpload} tamaño={18} />
                    <span>Subir archivo</span>
                </button>
            )}
            {puedeSubir && puedeCarpeta && (
                <button type="button" className="menu-agregar__opcion" onClick={onSubirCarpeta}>
                    <Icono src={iconoUpload} tamaño={18} />
                    <span>Subir carpeta</span>
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