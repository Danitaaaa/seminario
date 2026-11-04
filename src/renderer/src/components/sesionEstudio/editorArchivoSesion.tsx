import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import mammoth from 'mammoth';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import type { Archivo } from '../../types/nodo';
import { BarraEditorSesion } from './barraEditorSesion';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

// Espera desde la última tecla hasta guardar solo (igual que las pestañas de la sesión).
const ESPERA_GUARDADO_MS = 1500;

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';
export type TipoArchivoEditable = 'docx' | 'texto';

interface EditorArchivoSesionProps {
  archivo: Archivo;
  tipo: TipoArchivoEditable;
  // Dibuja la fila de pestañas con lo que va a la derecha (estado de guardado y botón Guardar).
  filaPestanas: (guardado: ReactNode) => ReactNode;
  // Se llama después de guardar en Material (la sesión lo usa para recargar sus pestañas).
  onGuardado?: () => void;
}

const escaparHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Convierte el archivo de Material en HTML para el editor: el Word con mammoth, el texto línea por línea.
async function leerComoHtml(tipo: TipoArchivoEditable, bytes: Uint8Array): Promise<string> {
  if (tipo === 'texto') {
    return new TextDecoder('utf-8')
      .decode(bytes)
      .split(/\r?\n/)
      .map((linea) => `<p>${escaparHtml(linea)}</p>`)
      .join('');
  }
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return value;
}

// Pestaña de un Word o un texto de Material: se ve y se edita igual que una pestaña de la sesión
// (misma barra de formato, misma hoja), pero los cambios se guardan en el archivo de Material.
export function EditorArchivoSesion({ archivo, tipo, filaPestanas, onGuardado }: EditorArchivoSesionProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    window.api
      .leerArchivo({ id: archivo.id })
      .then((r) => leerComoHtml(tipo, r.contenido))
      .then((contenido) => activo && setHtml(contenido))
      .catch((e) => activo && setError(extraerMensajeError(e, 'No se pudo abrir el archivo. Puede que lo hayan borrado de Material.')));
    return () => {
      activo = false;
    };
  }, [archivo.id, tipo]);

  if (html === null) {
    return (
      <>
        <div className="editor-sesion__barra" />
        {filaPestanas(null)}
        <div className={`editor-sesion__hoja editor-sesion__hoja--cargando${error ? ' editor-sesion__hoja--error' : ''}`}>
          {error ?? 'Cargando archivo…'}
        </div>
      </>
    );
  }

  return <EditorCargado archivo={archivo} tipo={tipo} htmlInicial={html} filaPestanas={filaPestanas} onGuardado={onGuardado} />;
}

interface EditorCargadoProps extends EditorArchivoSesionProps {
  htmlInicial: string;
}

function EditorCargado({ archivo, tipo, htmlInicial, filaPestanas, onGuardado }: EditorCargadoProps) {
  const avisos = usarAvisos();
  const [estado, setEstado] = useState<EstadoGuardado>('guardado');
  const pendiente = useRef(false);
  const temporizador = useRef<number | undefined>(undefined);
  // El editor se crea una sola vez: llama al guardado más reciente a través de esta referencia.
  const guardarRef = useRef<() => Promise<boolean>>(async () => true);
  // Último contenido escrito. Se guarda acá para poder guardarlo aunque el editor ya se haya cerrado.
  const ultimo = useRef({ html: htmlInicial, texto: '' });

  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, autolink: true } })],
    content: htmlInicial,
    // La barra muestra qué formato está activo: necesita redibujarse en cada cambio.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: actual }) => {
      ultimo.current = { html: actual.getHTML(), texto: actual.getText({ blockSeparator: '\n' }) };
      pendiente.current = true;
      setEstado('pendiente');
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => void guardarRef.current(), ESPERA_GUARDADO_MS);
    },
  });

  // Guarda en Material lo que hay en el editor. Devuelve false si falló.
  const guardar = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(temporizador.current);
    if (!pendiente.current) return true;
    pendiente.current = false;
    setEstado('guardando');
    try {
      if (tipo === 'docx') {
        await window.api.guardarDocx({ id: archivo.id, html: ultimo.current.html });
      } else {
        await window.api.guardarArchivo({ id: archivo.id, contenido: new TextEncoder().encode(ultimo.current.texto) });
      }
      setEstado(pendiente.current ? 'pendiente' : 'guardado');
      onGuardado?.();
      return true;
    } catch (e) {
      pendiente.current = true;
      setEstado('error');
      avisos.error(extraerMensajeError(e, 'No se pudo guardar el archivo en Material.'));
      return false;
    }
  }, [tipo, archivo.id, avisos, onGuardado]);
  guardarRef.current = guardar;

  const guardarAhora = useCallback(async () => {
    if (await guardar()) avisos.exito(`Se guardaron los cambios en "${archivo.nombre}".`);
  }, [guardar, avisos, archivo.nombre]);

  // Ctrl+S / Cmd+S guarda este archivo mientras su pestaña está abierta.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void guardarAhora();
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [guardarAhora]);

  // Al cambiar de pestaña o salir de la sesión se guarda lo que haya quedado sin guardar.
  useEffect(() => () => void guardarRef.current(), []);

  const guardado = (
    <div className="editor-sesion__guardado">
      <IndicadorArchivo estado={estado} />
      <button type="button" className="boton-chico" onClick={() => void guardarAhora()} title="Guardar en Material (Ctrl+S)">
        Guardar
      </button>
    </div>
  );

  return (
    <>
      <BarraEditorSesion editor={editor} />
      {filaPestanas(guardado)}
      <EditorContent editor={editor} className="editor-sesion__hoja" />
    </>
  );
}

function IndicadorArchivo({ estado }: { estado: EstadoGuardado }) {
  if (estado === 'guardando') {
    return <span className="editor-sesion__estado"><Loader2 size={13} className="girando" /> Guardando…</span>;
  }
  if (estado === 'pendiente') return <span className="editor-sesion__estado">Cambios sin guardar</span>;
  if (estado === 'error') {
    return <span className="editor-sesion__estado editor-sesion__estado--error"><CloudOff size={13} /> Sin guardar</span>;
  }
  return <span className="editor-sesion__estado editor-sesion__estado--ok"><Check size={13} /> Guardado en Material</span>;
}
