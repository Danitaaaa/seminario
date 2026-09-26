import iconoFolder from '../assets/iconsFile1/folder.svg';
import iconoCsv from '../assets/iconsFile1/file-csv.svg';
import iconoGenerico from '../assets/iconsFile1/file-generic.svg';
import iconoImagen from '../assets/iconsFile1/file-image.svg';
import iconoJpg from '../assets/iconsFile1/file-jpg.svg';
import iconoPdf from '../assets/iconsFile1/file-pdf.svg';
import iconoPng from '../assets/iconsFile1/file-png.svg';
import iconoPpt from '../assets/iconsFile1/file-ppt.svg';
import iconoPptx from '../assets/iconsFile1/file-pptx.svg';
import iconoVideo from '../assets/iconsFile1/file-video.svg';
import iconoXlsx from '../assets/iconsFile1/file-xlsx.svg';
import iconoDocumento from '../assets/iconsFile1/file-docx.svg';

// Tabla extensión → { ícono, etiqueta de tipo }.
// Abierta a extensión (OCP): agregar un tipo de archivo nuevo es agregar una fila acá,
// no tocar los componentes que llaman a resolverIconoNodo.
const ICONOS_POR_EXTENSION: Record<string, { icono: string; tipo: string }> = {
    csv: { icono: iconoCsv, tipo: 'CSV' },
    png: { icono: iconoPng, tipo: 'Imagen' },
    jpg: { icono: iconoJpg, tipo: 'Imagen' },
    jpeg: { icono: iconoJpg, tipo: 'Imagen' },
    gif: { icono: iconoImagen, tipo: 'Imagen' },
    webp: { icono: iconoImagen, tipo: 'Imagen' },
    pdf: { icono: iconoPdf, tipo: 'PDF' },
    ppt: { icono: iconoPpt, tipo: 'Presentación' },
    pptx: { icono: iconoPptx, tipo: 'Presentación' },
    xlsx: { icono: iconoXlsx, tipo: 'Planilla' },
    xls: { icono: iconoXlsx, tipo: 'Planilla' },
    mp4: { icono: iconoVideo, tipo: 'Video' },
    mov: { icono: iconoVideo, tipo: 'Video' },
    avi: { icono: iconoVideo, tipo: 'Video' },
    docx: { icono: iconoDocumento, tipo: 'Documento' }
};

interface InfoNodo {
    icono: string;
    tipo: string;
}

// Los nodos hoy son siempre carpetas (ver backend), pero esta función ya soporta
// distinguir archivos por extensión para cuando el backend agregue ese tipo de nodo.
export function resolverIconoNodo(nombre: string, esCarpeta: boolean = true): InfoNodo {
    if (esCarpeta) {
        return { icono: iconoFolder, tipo: 'Carpeta' };
    }

    const extension = nombre.split('.').pop()?.toLowerCase() ?? '';
    return ICONOS_POR_EXTENSION[extension] ?? { icono: iconoGenerico, tipo: 'Archivo' };
}
