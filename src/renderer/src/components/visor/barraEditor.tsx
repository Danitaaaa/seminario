import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { elegirImagenes } from '../comunes/imagenesEditor';
import { HerramientasImagen } from '../comunes/herramientasImagen';

interface BarraEditorProps {
  editor: Editor | null;
  modificado: boolean;
  onGuardar: () => void;
  conFormato?: boolean;
  soloLectura?: boolean; // sin barra: no hay nada que editar ni guardar
  conTablas?: boolean; // tablas y saltos de página (el editor tiene que tener TableKit)
  extra?: ReactNode; // botones propios del visor, antes de Guardar
}

// Barra de herramientas compartida por los editores de Word y de notas.
export function BarraEditor({
  editor, modificado, onGuardar, conFormato = true, soloLectura = false, conTablas = false, extra,
}: BarraEditorProps) {
  if (!editor || soloLectura) return null;

  const boton = (etiqueta: string, activo: boolean, accion: () => void) => (
    <button
      key={etiqueta}
      className={`visor-boton ${activo ? '' : 'visor-boton--contorno'}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={accion}
    >
      {etiqueta}
    </button>
  );

  return (
    <div className="visor__barra">
      {conFormato && (
        <>
          {boton('N', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
          {boton('C', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
          {boton('T1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          {boton('T2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          {boton('• Lista', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
          {boton('1. Lista', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
          {boton('Imagen', false, () => elegirImagenes(editor))}
          {conTablas && (
            <>
              {boton('Tabla', false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
              {boton('Salto de página', false, () => editor.chain().focus().setHorizontalRule().run())}
              {/* Con el cursor en una tabla aparecen sus herramientas. */}
              {editor.isActive('table') && (
                <>
                  {boton('+ Fila', false, () => editor.chain().focus().addRowAfter().run())}
                  {boton('+ Columna', false, () => editor.chain().focus().addColumnAfter().run())}
                  {boton('− Fila', false, () => editor.chain().focus().deleteRow().run())}
                  {boton('− Columna', false, () => editor.chain().focus().deleteColumn().run())}
                  {boton('Quitar tabla', false, () => editor.chain().focus().deleteTable().run())}
                </>
              )}
            </>
          )}
          <HerramientasImagen
            editor={editor}
            boton={(etiqueta, icono, activo, accion) => (
              <button
                key={etiqueta}
                className={`visor-boton ${activo ? '' : 'visor-boton--contorno'}`}
                title={etiqueta}
                aria-label={etiqueta}
                onMouseDown={(e) => e.preventDefault()}
                onClick={accion}
              >
                {icono}
              </button>
            )}
          />
        </>
      )}
      {boton('Deshacer', false, () => editor.chain().focus().undo().run())}
      {boton('Rehacer', false, () => editor.chain().focus().redo().run())}
      <span className="visor__separador" />
      {extra}
      <button className="visor-boton" disabled={!modificado} onClick={onGuardar}>Guardar</button>
    </div>
  );
}