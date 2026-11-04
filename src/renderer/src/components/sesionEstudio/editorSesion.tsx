import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import type { PestanaSesion } from '../../types/sesionesEstudio';
import type { Archivo } from '../../types/nodo';
import { BarraEditorSesion } from './barraEditorSesion';
import { PestanasSesion } from './pestanasSesion';
import { ModalConfirmar } from './modalConfirmar';
import { ModalAbrirMaterial } from './modalAbrirMaterial';
import { VistaArchivoSesion } from './vistaArchivoSesion';
import { EditorArchivoSesion } from './editorArchivoSesion';
import { tipoVisor } from '../visor/formatos';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

// Espera desde la última tecla hasta guardar solo.
const ESPERA_GUARDADO_MS = 1500;

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';

interface EditorSesionProps {
  usuarioId: number;
  idSesion: number;
}

// Editor de la sesión con pestañas. Cada pestaña se guarda en la base de datos y, con ella,
// el Word de la sesión en Material. Guarda solo unos segundos después de escribir;
// "Guardar" (o Ctrl+S) guarda en el momento y muestra el cartel de confirmación.
export function EditorSesion({ usuarioId, idSesion }: EditorSesionProps) {
  const avisos = usarAvisos();
  const [pestanas, setPestanas] = useState<PestanaSesion[]>([]);
  const [idActiva, setIdActiva] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<EstadoGuardado>('guardado');
  const [porEliminar, setPorEliminar] = useState<PestanaSesion | null>(null);
  // Archivos de Material abiertos como pestañas. Se recuerdan por sesión (en este equipo)
  // para que sigan abiertos al volver; no forman parte del documento ni del Word de la sesión.
  const [eligiendoArchivo, setEligiendoArchivo] = useState(false);
  const [archivos, setArchivos] = usarPreferencia<Archivo[]>(`sesion:${idSesion}:archivos`, []);
  const [idArchivoActivo, setIdArchivoActivo] = useState<number | null>(null);

  const pendientes = useRef(new Map<number, string>());
  const temporizador = useRef<number | undefined>(undefined);
  // Los guardados se encadenan para que uno viejo nunca pise a uno nuevo.
  const cadena = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    let activo = true;
    window.api
      .listarPestanasSesion(usuarioId, idSesion)
      .then((lista) => {
        if (!activo) return;
        setPestanas(lista);
        setIdActiva(lista[0]?.idPestana ?? null);
      })
      .catch((e) => avisos.error(extraerMensajeError(e, 'No se pudo cargar el documento de la sesión.')))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [usuarioId, idSesion, avisos]);

  // Guarda todo lo que haya pendiente. Devuelve false si falló.
  const guardarPendientes = useCallback((): Promise<boolean> => {
    window.clearTimeout(temporizador.current);
    cadena.current = cadena.current.then(async () => {
      if (pendientes.current.size === 0) return true;
      const lote = [...pendientes.current];
      pendientes.current.clear();
      setEstado('guardando');
      try {
        for (const [idPestana, contenido] of lote) {
          await window.api.guardarContenidoSesionEstudio({ usuarioId, idSesion, idPestana, contenido });
        }
        setEstado(pendientes.current.size > 0 ? 'pendiente' : 'guardado');
        return true;
      } catch (e) {
        for (const [id, html] of lote) if (!pendientes.current.has(id)) pendientes.current.set(id, html);
        setEstado('error');
        avisos.error(extraerMensajeError(e, 'No se pudieron guardar los cambios.'));
        return false;
      }
    });
    return cadena.current;
  }, [usuarioId, idSesion, avisos]);

  // Al salir de la pantalla se guarda lo que haya quedado sin guardar.
  const guardarAlSalir = useRef(guardarPendientes);
  guardarAlSalir.current = guardarPendientes;
  useEffect(() => () => void guardarAlSalir.current(), []);

  const alCambiar = useCallback((idPestana: number, html: string) => {
    pendientes.current.set(idPestana, html);
    setPestanas((actuales) => actuales.map((p) => (p.idPestana === idPestana ? { ...p, contenido: html } : p)));
    setEstado('pendiente');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarPendientes(), ESPERA_GUARDADO_MS);
  }, [guardarPendientes]);

  const guardarAhora = useCallback(async () => {
    if (await guardarPendientes()) avisos.exito('Se guardaron los cambios.');
  }, [guardarPendientes, avisos]);

  // Ctrl+S / Cmd+S guarda. Si hay un archivo de Material abierto, lo guarda su propia pestaña.
  const hayArchivoActivo = useRef(false);
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (hayArchivoActivo.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void guardarAhora();
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [guardarAhora]);

  async function elegir(idPestana: number) {
    setIdArchivoActivo(null);
    if (idPestana === idActiva) return;
    void guardarPendientes();
    setIdActiva(idPestana);
  }

  async function agregar() {
    try {
      await guardarPendientes();
      const nueva = await window.api.crearPestanaSesion({ usuarioId, idSesion });
      setPestanas((actuales) => [...actuales, nueva]);
      setIdArchivoActivo(null);
      setIdActiva(nueva.idPestana);
      avisos.exito(`Se creó la pestaña "${nueva.titulo}".`);
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo crear la pestaña.'));
    }
  }

  async function renombrar(idPestana: number, titulo: string) {
    try {
      const actualizada = await window.api.renombrarPestanaSesion({ usuarioId, idPestana, titulo });
      setPestanas((actuales) => actuales.map((p) => (p.idPestana === idPestana ? { ...p, titulo: actualizada.titulo } : p)));
      avisos.exito('Se renombró la pestaña.');
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo renombrar la pestaña.'));
    }
  }

  async function eliminar(pestana: PestanaSesion) {
    setPorEliminar(null);
    try {
      pendientes.current.delete(pestana.idPestana);
      await guardarPendientes();
      await window.api.eliminarPestanaSesion(usuarioId, pestana.idPestana);
      const restantes = pestanas.filter((p) => p.idPestana !== pestana.idPestana);
      setPestanas(restantes);
      if (idActiva === pestana.idPestana) setIdActiva(restantes[0]?.idPestana ?? null);
      avisos.exito(`Se eliminó "${pestana.titulo}".`);
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo eliminar la pestaña.'));
    }
  }

  // Abre el archivo elegido en Material como una pestaña más (si ya estaba abierto, solo lo muestra).
  function abrirArchivo(archivo: Archivo) {
    setEligiendoArchivo(false);
    void guardarPendientes();
    setArchivos((actuales) => (actuales.some((a) => a.id === archivo.id) ? actuales : [...actuales, archivo]));
    setIdArchivoActivo(archivo.id);
  }

  // Cierra la pestaña del archivo. Si era la que se estaba viendo, vuelve al documento de la sesión.
  function cerrarArchivo(idArchivo: number) {
    setArchivos((actuales) => actuales.filter((a) => a.id !== idArchivo));
    if (idArchivoActivo === idArchivo) setIdArchivoActivo(null);
  }

  function elegirArchivo(idArchivo: number) {
    void guardarPendientes();
    setIdArchivoActivo(idArchivo);
  }

  const archivoActivo = archivos.find((a) => a.id === idArchivoActivo) ?? null;
  hayArchivoActivo.current = archivoActivo !== null;
  const tipoArchivo = archivoActivo ? tipoVisor(archivoActivo.extension) : null;

  // Después de guardar un Word desde su pestaña se vuelven a leer las pestañas de la sesión:
  // si ese Word era el de esta misma sesión, Material ya actualizó su contenido en la base.
  const recargarPestanas = useCallback(() => {
    window.api
      .listarPestanasSesion(usuarioId, idSesion)
      .then((lista) => setPestanas(lista))
      .catch(() => undefined);
  }, [usuarioId, idSesion]);

  const activa = pestanas.find((p) => p.idPestana === idActiva) ?? null;

  // Fila de pestañas; a la derecha va el estado de guardado de lo que se está viendo.
  const filaPestanas = (guardado: ReactNode) => (
    <div className="editor-sesion__fila-pestanas">
      <PestanasSesion
        pestanas={pestanas}
        idActiva={archivoActivo ? null : idActiva}
        onElegir={(id) => void elegir(id)}
        onAgregar={() => void agregar()}
        onAbrirArchivo={() => setEligiendoArchivo(true)}
        archivos={archivos}
        idArchivoActivo={archivoActivo?.id ?? null}
        onElegirArchivo={elegirArchivo}
        onCerrarArchivo={cerrarArchivo}
        onRenombrar={(id, t) => void renombrar(id, t)}
        onEliminar={setPorEliminar}
      />
      {guardado}
    </div>
  );

  const guardadoSesion = (
    <div className="editor-sesion__guardado">
      <IndicadorGuardado estado={estado} />
      <button type="button" className="boton-chico" onClick={() => void guardarAhora()} title="Guardar (Ctrl+S)">
        Guardar
      </button>
    </div>
  );

  return (
    <div className="editor-sesion">
      {archivoActivo && (tipoArchivo === 'docx' || tipoArchivo === 'texto') ? (
        // Word y texto: se ven y se editan como una pestaña más de la sesión.
        <EditorArchivoSesion
          key={archivoActivo.id}
          archivo={archivoActivo}
          tipo={tipoArchivo}
          filaPestanas={filaPestanas}
          onGuardado={tipoArchivo === 'docx' ? recargarPestanas : undefined}
        />
      ) : archivoActivo ? (
        // PDF, Excel y otros formatos: se muestran con su visor dentro de la hoja.
        <>
          {filaPestanas(
            <div className="editor-sesion__guardado">
              <span className="editor-sesion__estado">Archivo de Material</span>
            </div>
          )}
          <VistaArchivoSesion key={archivoActivo.id} archivo={archivoActivo} />
        </>
      ) : cargando || !activa ? (
        <>
          <div className="editor-sesion__barra" />
          <div className="editor-sesion__hoja editor-sesion__hoja--cargando">
            {cargando ? 'Cargando documento…' : 'No se encontró el documento de la sesión.'}
          </div>
        </>
      ) : (
        <EditorPestana
          key={activa.idPestana}
          contenidoInicial={activa.contenido}
          onCambio={(html) => alCambiar(activa.idPestana, html)}
          barraPestanas={filaPestanas(guardadoSesion)}
        />
      )}

      {porEliminar && (
        <ModalConfirmar
          titulo="Eliminar pestaña"
          mensaje={<>¿Seguro que querés eliminar <strong>{porEliminar.titulo}</strong>? Se borra su contenido.</>}
          onConfirmar={() => void eliminar(porEliminar)}
          onCancelar={() => setPorEliminar(null)}
        />
      )}

      {eligiendoArchivo && <ModalAbrirMaterial onElegir={abrirArchivo} onCerrar={() => setEligiendoArchivo(false)} />}
    </div>
  );
}

interface EditorPestanaProps {
  contenidoInicial: string;
  onCambio: (html: string) => void;
  barraPestanas: ReactNode;
}

// Un editor Tiptap por pestaña (se vuelve a montar al cambiar de pestaña, con su propio historial).
function EditorPestana({ contenidoInicial, onCambio, barraPestanas }: EditorPestanaProps) {
  const alCambiar = useRef(onCambio);
  alCambiar.current = onCambio;

  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, autolink: true } })],
    content: contenidoInicial,
    // La barra muestra qué formato está activo: necesita redibujarse en cada cambio.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: actual }) => alCambiar.current(actual.getHTML()),
  });

  return (
    <>
      <BarraEditorSesion editor={editor} />
      {barraPestanas}
      <EditorContent editor={editor} className="editor-sesion__hoja" />
    </>
  );
}

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado === 'guardando') {
    return <span className="editor-sesion__estado"><Loader2 size={13} className="girando" /> Guardando…</span>;
  }
  if (estado === 'pendiente') return <span className="editor-sesion__estado">Cambios sin guardar</span>;
  if (estado === 'error') {
    return <span className="editor-sesion__estado editor-sesion__estado--error"><CloudOff size={13} /> Sin guardar</span>;
  }
  return <span className="editor-sesion__estado editor-sesion__estado--ok"><Check size={13} /> Guardado en la sesión y en Material</span>;
}
