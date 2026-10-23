import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BarraEditor } from '../visor/barraEditor';
import '../../styles/visor.css';

interface EditorSesionProps {
  contenidoInicial: string;
  // Guarda el HTML en la sesión y en su archivo Word de Material.
  onGuardar: (html: string) => Promise<void>;
  // Avisa si hay cambios sin guardar (para confirmar al salir).
  onModificadoChange?: (modificado: boolean) => void;
}

// Editor de la sesión: el mismo editor de los Word de Material (Tiptap + barra compartida).
export function EditorSesion({ contenidoInicial, onGuardar, onModificadoChange }: EditorSesionProps) {
  const [modificado, setModificado] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: contenidoInicial,
    onUpdate: () => setModificado(true),
  });

  useEffect(() => {
    onModificadoChange?.(modificado);
  }, [modificado, onModificadoChange]);

  // Guarda el contenido actual y marca el editor como sin cambios pendientes.
  const guardar = async () => {
    if (!editor) return;
    await onGuardar(editor.getHTML());
    setModificado(false);
  };

  return (
    <div className="visor-editor">
      <BarraEditor editor={editor} modificado={modificado} onGuardar={guardar} />
      <EditorContent editor={editor} className="visor-editor__hoja" />
    </div>
  );
}
