import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  IndentDecrease, IndentIncrease, Heading2, Link2, Undo2, Redo2,
} from 'lucide-react';

interface BarraEditorSesionProps {
  editor: Editor | null;
}

// Barra de herramientas del editor de la sesión (estilo de la referencia: franja crema con íconos).
// Es distinta de la barra de los Word de Material (visor/barraEditor.tsx), que se deja como está.
export function BarraEditorSesion({ editor }: BarraEditorSesionProps) {
  const [editandoEnlace, setEditandoEnlace] = useState(false);
  const [url, setUrl] = useState('');

  if (!editor) return <div className="editor-sesion__barra" />;

  const boton = (etiqueta: string, icono: ReactNode, activo: boolean, accion: () => void, deshabilitado = false) => (
    <button
      key={etiqueta}
      type="button"
      className={`editor-sesion__herramienta${activo ? ' editor-sesion__herramienta--activa' : ''}`}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      disabled={deshabilitado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={accion}
    >
      {icono}
    </button>
  );

  const cadena = () => editor.chain().focus();
  const enLista = editor.isActive('bulletList') || editor.isActive('orderedList');

  function abrirEnlace() {
    setUrl((editor?.getAttributes('link').href as string | undefined) ?? '');
    setEditandoEnlace(true);
  }

  function aplicarEnlace() {
    const limpia = url.trim();
    if (limpia === '') {
      cadena().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^[a-z]+:\/\//i.test(limpia) ? limpia : `https://${limpia}`;
      cadena().extendMarkRange('link').setLink({ href }).run();
    }
    setEditandoEnlace(false);
  }

  return (
    <div className="editor-sesion__barra" role="toolbar" aria-label="Formato del texto">
      {boton('Negrita', <Bold size={15} />, editor.isActive('bold'), () => cadena().toggleBold().run())}
      {boton('Cursiva', <Italic size={15} />, editor.isActive('italic'), () => cadena().toggleItalic().run())}
      {boton('Subrayado', <Underline size={15} />, editor.isActive('underline'), () => cadena().toggleUnderline().run())}
      {boton('Tachado', <Strikethrough size={15} />, editor.isActive('strike'), () => cadena().toggleStrike().run())}
      <span className="editor-sesion__separador" />
      {boton('Lista con viñetas', <List size={15} />, editor.isActive('bulletList'), () => cadena().toggleBulletList().run())}
      {boton('Lista numerada', <ListOrdered size={15} />, editor.isActive('orderedList'), () => cadena().toggleOrderedList().run())}
      {boton('Cita', <Quote size={15} />, editor.isActive('blockquote'), () => cadena().toggleBlockquote().run())}
      <span className="editor-sesion__separador" />
      {boton('Disminuir sangría', <IndentDecrease size={15} />, false, () => cadena().liftListItem('listItem').run(), !enLista)}
      {boton('Título', <Heading2 size={15} />, editor.isActive('heading', { level: 2 }), () => cadena().toggleHeading({ level: 2 }).run())}
      {boton('Aumentar sangría', <IndentIncrease size={15} />, false, () => cadena().sinkListItem('listItem').run(), !enLista)}
      <span className="editor-sesion__separador" />
      {boton('Enlace', <Link2 size={15} />, editor.isActive('link'), abrirEnlace)}
      {boton('Deshacer', <Undo2 size={15} />, false, () => cadena().undo().run(), !editor.can().undo())}
      {boton('Rehacer', <Redo2 size={15} />, false, () => cadena().redo().run(), !editor.can().redo())}

      {editandoEnlace && (
        <div className="editor-sesion__enlace">
          <input
            autoFocus
            value={url}
            placeholder="Pegá un enlace…"
            aria-label="Dirección del enlace"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); aplicarEnlace(); }
              if (e.key === 'Escape') setEditandoEnlace(false);
            }}
          />
          <button type="button" className="boton-chico" onClick={aplicarEnlace}>Aplicar</button>
          <button type="button" className="boton-chico boton-chico--claro" onClick={() => setEditandoEnlace(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
