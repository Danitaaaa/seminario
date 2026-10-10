import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BarraEditor } from './barraEditor';

interface VisorDocxProps {
  contenido: Uint8Array;
  onGuardar: (html: string) => Promise<void>;
}

// Convierte el DOCX a HTML con mammoth y lo edita con Tiptap. Al guardar, el main lo vuelve a DOCX.
export function VisorDocx({ contenido, onGuardar }: VisorDocxProps) {
  const [cargado, setCargado] = useState(false);
  const [modificado, setModificado] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: () => setModificado(true),
  });

  useEffect(() => {
    if (!editor) return;
    const buffer = contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength) as ArrayBuffer;
    mammoth.convertToHtml({ arrayBuffer: buffer }).then((r) => {
      editor.commands.setContent(r.value, { emitUpdate: false });
      setCargado(true);
    });
  }, [editor, contenido]);

  const guardar = async () => {
    if (!editor) return;
    await onGuardar(editor.getHTML());
    setModificado(false);
  };

  return (
    <div className="visor-editor">
      <BarraEditor editor={editor} modificado={modificado} onGuardar={guardar} />
      <p className="visor__nota">
        Se conservan texto, títulos, listas y negritas. El diseño exacto del Word original (tablas complejas, encabezados) puede cambiar al guardar.
      </p>
      {!cargado && <p className="visor__cargando">Cargando documento…</p>}
      <EditorContent editor={editor} className="visor-editor__hoja" />
    </div>
  );
}