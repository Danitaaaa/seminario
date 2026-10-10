import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BarraEditor } from './barraEditor';

interface VisorTextoProps {
  contenido: Uint8Array;
  onGuardar: (bytes: Uint8Array) => Promise<void>;
}

const escaparHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Notas en texto plano (.txt, .md) editadas con Tiptap; se guardan como texto plano.
export function VisorTexto({ contenido, onGuardar }: VisorTextoProps) {
  const [modificado, setModificado] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: new TextDecoder('utf-8')
      .decode(contenido)
      .split(/\r?\n/)
      .map((linea) => `<p>${escaparHtml(linea)}</p>`)
      .join(''),
    onUpdate: () => setModificado(true),
  });

  const guardar = async () => {
    if (!editor) return;
    const texto = editor.getText({ blockSeparator: '\n' });
    await onGuardar(new TextEncoder().encode(texto));
    setModificado(false);
  };

  return (
    <div className="visor-editor">
      <BarraEditor editor={editor} modificado={modificado} onGuardar={guardar} conFormato={false} />
      <EditorContent editor={editor} className="visor-editor__hoja visor-editor__hoja--texto" />
    </div>
  );
}