import Image from '@tiptap/extension-image';
import type { Editor } from '@tiptap/react';

import '../../styles/imagenesEditor.css';

export type Alineacion = 'izquierda' | 'centro' | 'derecha';

// Lo que se usa de la vista con esquinas que arma Tiptap (ResizableNodeView).
interface VistaImagen {
  node: { attrs: Record<string, unknown> };
  element: HTMLElement;
  update: (nodo: { attrs: Record<string, unknown> }, ...resto: unknown[]) => boolean;
  applyInitialSize: () => void;
}

// Imágenes dentro de los editores (sesiones y Word de Material). Se guardan dentro del HTML
// como base64, así viajan con el documento y también quedan en el Word al guardar.
// Se agrandan o achican arrastrando las esquinas (el tamaño queda en width/height, que el Word respeta)
// y se pueden alinear a la izquierda, al centro o a la derecha.
export const extensionImagen = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alinear: {
        default: 'izquierda',
        parseHTML: (el) => el.getAttribute('data-alinear') ?? 'izquierda',
        renderHTML: (atributos) => ({ 'data-alinear': atributos.alinear }),
      },
    };
  },
  // Tiptap toma el tamaño solo al crear la imagen: al recortar o volver al tamaño original
  // (cambian width/height o la imagen) se vuelve a aplicar.
  addNodeView() {
    const crear = this.parent?.();
    if (!crear) return null;
    return (props) => {
      const vista = crear(props) as unknown as VistaImagen;
      const actualizarOriginal = vista.update.bind(vista);
      vista.update = (nodo, ...resto) => {
        const antes = vista.node.attrs;
        const aceptada = actualizarOriginal(nodo, ...resto);
        const { width, height, src } = nodo.attrs;
        if (aceptada && (antes.width !== width || antes.height !== height || antes.src !== src)) {
          vista.element.style.width = width ? `${width}px` : '';
          vista.element.style.height = height ? `${height}px` : '';
          requestAnimationFrame(() => vista.applyInitialSize());
        }
        return aceptada;
      };
      return vista as never;
    };
  },
}).configure({
  allowBase64: true,
  resize: {
    enabled: true,
    directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    minWidth: 40,
    minHeight: 40,
    alwaysPreserveAspectRatio: true,
  },
});

// Lado más largo de la imagen guardada: una foto del celular pesa varios MB y no hace falta tanto.
const LADO_MAXIMO = 1400;

function leerComoDataUrl(archivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(archivo);
  });
}

// Achica la imagen si es grande. Las PNG chicas (capturas, esquemas) se dejan como están.
async function prepararImagen(archivo: File): Promise<string> {
  const original = await leerComoDataUrl(archivo);
  const imagen = new window.Image();
  imagen.src = original;
  await imagen.decode();
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  if (escala === 1 && archivo.size < 500_000) return original;

  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d')!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return archivo.type === 'image/png' ? lienzo.toDataURL('image/png') : lienzo.toDataURL('image/jpeg', 0.85);
}

export async function insertarImagenes(editor: Editor, archivos: Iterable<File>): Promise<void> {
  for (const archivo of archivos) {
    if (!archivo.type.startsWith('image/')) continue;
    editor.chain().focus().setImage({ src: await prepararImagen(archivo), alt: archivo.name }).run();
  }
}

// Abre el selector de archivos del sistema y agrega las imágenes elegidas donde está el cursor.
export function elegirImagenes(editor: Editor): void {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'image/*';
  entrada.multiple = true;
  entrada.onchange = () => void insertarImagenes(editor, entrada.files ?? []);
  entrada.click();
}

// Pegar (Ctrl+V) o arrastrar imágenes al editor.
export const propsImagenes = {
  handlePaste: (vista: { dom: Element }, evento: ClipboardEvent) => soltarImagenes(vista, evento.clipboardData?.files),
  handleDrop: (vista: { dom: Element }, evento: DragEvent) => soltarImagenes(vista, evento.dataTransfer?.files),
};

// El editor de la vista se guarda en el elemento por Tiptap (dom.editor).
function soltarImagenes(vista: { dom: Element }, archivos: FileList | undefined | null): boolean {
  const imagenes = [...(archivos ?? [])].filter((a) => a.type.startsWith('image/'));
  const editor = (vista.dom as Element & { editor?: Editor }).editor;
  if (imagenes.length === 0 || !editor) return false;
  void insertarImagenes(editor, imagenes);
  return true;
}
