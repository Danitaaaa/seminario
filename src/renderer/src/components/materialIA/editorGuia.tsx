// src/renderer/src/components/materialIA/EditorGuia.tsx
// Editor de la guía antes de guardarla: mismo Tiptap + BarraEditor que VisorDocx, pero parte de HTML (no de un .docx).
import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BarraEditor } from '../visor/barraEditor';

interface EditorGuiaProps {
  html: string;
  guardando?: boolean;
  /** Recibe el HTML ya corregido. */
  onGuardar: (html: string) => Promise<void>;
}

export function EditorGuia({ html, guardando = false, onGuardar }: EditorGuiaProps) {
  const editor = useEditor({ extensions: [StarterKit], content: html, editable: !guardando });

  useEffect(() => {
    editor?.setEditable(!guardando);
  }, [editor, guardando]);

  useEffect(() => {
    editor?.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);

  return (
    <div className="visor-editor">
      {/* Siempre "modificado": es un documento nuevo, tiene que poder guardarse aunque no se toque nada. */}
      <BarraEditor
        editor={editor}
        modificado
        soloLectura={guardando}
        onGuardar={async () => {
          if (editor) await onGuardar(editor.getHTML());
        }}
      />
      <EditorContent editor={editor} className="visor-editor__hoja" />
    </div>
  );
}
