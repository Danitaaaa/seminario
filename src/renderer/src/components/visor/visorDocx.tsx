import { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { BarraEditor } from './barraEditor';
import { extensionImagen, propsImagenes } from '../comunes/imagenesEditor';

interface VisorDocxProps {
  contenido: Uint8Array;
  onGuardar: (html: string) => Promise<void>;
  soloLectura?: boolean;
}

// Los saltos de página del Word llegan al editor como una línea (<hr>); al guardar vuelven a ser saltos.
const MAPA_ESTILOS = ["br[type='page'] => hr"];

const aArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

// Vista: el Word tal cual (páginas, tablas, márgenes, encabezados) con docx-preview.
// Editar: el texto pasa a Tiptap (con tablas y saltos de página) y al guardar el main lo vuelve a DOCX.
export function VisorDocx({ contenido, onGuardar, soloLectura = false }: VisorDocxProps) {
  const [modo, setModo] = useState<'vista' | 'edicion'>('vista');
  const [cargado, setCargado] = useState(false);
  const [modificado, setModificado] = useState(false);
  const [errorVista, setErrorVista] = useState(false);
  const hoja = useRef<HTMLDivElement>(null);
  const estilos = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, extensionImagen, TableKit.configure({ table: { resizable: false } })],
    editorProps: propsImagenes,
    // La barra muestra las herramientas de imagen y de tabla según la selección: necesita redibujarse.
    shouldRerenderOnTransaction: true,
    content: '',
    editable: !soloLectura,
    onUpdate: () => setModificado(true),
  });

  // El permiso puede llegar después de crear el editor (se averigua si el archivo es de un proyecto).
  useEffect(() => {
    editor?.setEditable(!soloLectura);
    if (soloLectura) setModo('vista');
  }, [editor, soloLectura]);

  // Vista fiel: se vuelve a dibujar cuando cambia el archivo (por ejemplo, después de guardar).
  useEffect(() => {
    if (modo !== 'vista' || !hoja.current || !estilos.current) return;
    let vigente = true;
    setCargado(false);
    setErrorVista(false);
    renderAsync(aArrayBuffer(contenido), hoja.current, estilos.current, {
      className: 'docx',
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      useBase64URL: true,
    })
      .catch(() => vigente && setErrorVista(true))
      .finally(() => vigente && setCargado(true));
    return () => {
      vigente = false;
    };
  }, [contenido, modo]);

  // Al pasar a editar se convierte la última versión guardada. Mientras se edita no se pisa lo escrito.
  const editar = async () => {
    if (!editor) return;
    setCargado(false);
    const r = await mammoth.convertToHtml({ arrayBuffer: aArrayBuffer(contenido) }, { styleMap: MAPA_ESTILOS });
    // mammoth deja el salto dentro de un párrafo vacío: se saca para que no queden líneas en blanco de más.
    editor.commands.setContent(r.value.replace(/<p>\s*<hr\s*\/?>\s*<\/p>/gi, '<hr />'), { emitUpdate: false });
    setModificado(false);
    setModo('edicion');
    setCargado(true);
  };

  const guardar = async () => {
    if (!editor || soloLectura) return;
    await onGuardar(editor.getHTML());
    setModificado(false);
  };

  return (
    <div className="visor-editor">
      {modo === 'vista' ? (
        <>
          {!soloLectura && (
            <div className="visor__barra">
              <button className="visor-boton" onClick={() => void editar()} disabled={!editor}>Editar</button>
              <span className="visor__nota">Así se ve el Word original, con sus páginas, tablas y formato.</span>
            </div>
          )}
          {!cargado && <p className="visor__cargando">Cargando documento…</p>}
          {errorVista && (
            <p className="visor__nota">No se pudo mostrar el diseño original. Podés tocar Editar para ver el texto.</p>
          )}
          <div ref={estilos} hidden />
          <div ref={hoja} className="visor-docx__paginas" />
        </>
      ) : (
        <>
          <BarraEditor
            editor={editor}
            modificado={modificado}
            onGuardar={guardar}
            soloLectura={soloLectura}
            conTablas
            extra={
              // Primero hay que guardar: la vista muestra el archivo guardado.
              <button
                className="visor-boton visor-boton--contorno"
                onClick={() => setModo('vista')}
                disabled={modificado}
                title={modificado ? 'Guardá los cambios para ver cómo queda el documento' : undefined}
              >
                Ver documento
              </button>
            }
          />
          <p className="visor__nota">
            Al editar se conservan texto, títulos, listas, tablas, imágenes y saltos de página. Algunos detalles del
            diseño original (márgenes, encabezados, fuentes) pueden cambiar al guardar.
          </p>
          {!cargado && <p className="visor__cargando">Cargando documento…</p>}
          <EditorContent editor={editor} className="visor-editor__hoja" />
        </>
      )}
    </div>
  );
}
