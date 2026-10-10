import type { Editor } from '@tiptap/react';

interface BarraEditorProps {
  editor: Editor | null;
  modificado: boolean;
  onGuardar: () => void;
  conFormato?: boolean;
}

// Barra de herramientas compartida por los editores de Word y de notas.
export function BarraEditor({ editor, modificado, onGuardar, conFormato = true }: BarraEditorProps) {
  if (!editor) return null;

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
        </>
      )}
      {boton('Deshacer', false, () => editor.chain().focus().undo().run())}
      {boton('Rehacer', false, () => editor.chain().focus().redo().run())}
      <span className="visor__separador" />
      <button className="visor-boton" disabled={!modificado} onClick={onGuardar}>Guardar</button>
    </div>
  );
}