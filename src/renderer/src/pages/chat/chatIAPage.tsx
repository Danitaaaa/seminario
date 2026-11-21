import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays, Check, Copy, FileText, FileUp, FolderUp, ImagePlus, LoaderCircle, MessageCircle, Mic, PanelLeft, PanelLeftClose, Pencil,
  Plus, Search, SendHorizontal, Sparkles, Square, Trash2, X,
} from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { TextoConFormulas } from '../../components/comunes/textoConFormulas';
import { usarAvisos } from '../../hooks/usarAvisos';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { nombreProveedorIA } from '../../types/ia';
import type { ConversacionIA, DocumentoChat, LecturaAdjuntos, MensajeIA } from '../../types/chatIA';
import type { Archivo } from '../../types/nodo';
import { ModalAbrirMaterial } from '../../components/sesionEstudio/modalAbrirMaterial';
import { usarDictado } from '../../hooks/usarDictado';
import { mensajeError } from '../metodos/utilidadesMetodosIA';
import { TIPOS_IMAGEN_ACEPTADOS, imagenAJpeg, imagenComoSrc } from '../../utils/imagenes';
import '../../styles/sesionesEstudio.css';
import '../../styles/chatIA.css';

const SUGERENCIAS = [
  'Explicame un tema con un ejemplo sencillo',
  'Armame un plan para estudiar para un parcial en una semana',
  'Haceme preguntas para practicar un tema',
  'Dame técnicas para concentrarme mejor al estudiar',
];

// Pregunta que todavía espera respuesta: se muestra enseguida, pero se guarda recién cuando la IA responde.
interface Pendiente {
  trabajoId: string;
  texto: string;
  imagenes: string[];
  documentos: DocumentoChat[];
}

// Tienen que coincidir con gestionDeChatIA/dto.ts.
const MAX_IMAGENES = 4;
const MAX_DOCUMENTOS = 10;
const LADO_MAXIMO_IMAGEN = 1280; // px: alcanza para leer texto de una captura y pesa poco

// Si salís del chat y volvés, sigue la conversación que tenías abierta (y lo que estabas escribiendo).
// Dura mientras la app está abierta; "Nueva conversación" lo limpia.
let ultimaConversacion: number | null = null;
let borrador = '';

function formatearDia(fecha: string): string {
  const d = new Date(fecha);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// Chat con IA: se pregunta lo que sea y responde la IA disponible (Luna → Gemini → Gemma sin internet).
// Las conversaciones quedan guardadas: se ven con el botón del panel (arriba a la izquierda).
// Los brillitos empiezan en el centro; cuando se empieza a escribir pasan al lado de ese botón
// y sirven para empezar una conversación nueva.
export function ChatIAPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const idConversacion = id ? Number(id) : null;
  const { confirmar } = usarAvisos();

  const [conversaciones, setConversaciones] = useState<ConversacionIA[]>([]);
  const [mensajes, setMensajes] = useState<MensajeIA[]>([]);
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState(borrador);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [error, setError] = useState('');
  const [renombrando, setRenombrando] = useState<{ id: number; titulo: string } | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  // Imágenes listas para mandar con el próximo mensaje (JPEG en base64).
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [preparandoImagen, setPreparandoImagen] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const entradaImagenRef = useRef<HTMLInputElement>(null);
  // Archivos (PDF, Word o texto) para el próximo mensaje: el main ya leyó su texto.
  // Después de mandarlos, la IA los sigue teniendo en esa conversación mientras la app esté abierta.
  const [documentos, setDocumentos] = useState<DocumentoChat[]>([]);
  // La IA ve tu agenda y tu material (clases, eventos, sesiones, tareas, archivos) para ayudarte a organizarte.
  const [conAgenda, setConAgenda] = usarPreferencia<boolean>(`chat:agenda:${obtenerUsuarioId() ?? 0}`, true);
  const [leyendoArchivos, setLeyendoArchivos] = useState(false);
  const [menuAdjuntar, setMenuAdjuntar] = useState(false);
  const [buscandoEnSyntra, setBuscandoEnSyntra] = useState(false);
  const menuAdjuntarRef = useRef<HTMLDivElement>(null);
  // Micrófono: lo dictado se suma al final de lo que ya está escrito.
  const dictado = usarDictado(
    (dicho) => {
      setTexto((actual) => (actual.trim() ? `${actual.trimEnd()} ${dicho}` : dicho));
      entradaRef.current?.focus();
    },
    setError,
  );

  const montado = useRef(true);
  // Al crear una conversación ya tenemos sus mensajes: no hace falta volver a pedirlos al cambiar la ruta.
  const recienCreada = useRef<number | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargarLista = useCallback(async () => {
    try {
      setConversaciones(await window.api.listarConversacionesIA());
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron cargar tus conversaciones.'));
    }
  }, []);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  // Al entrar a /chat se vuelve a la conversación que estaba abierta.
  useEffect(() => {
    if (idConversacion == null && ultimaConversacion != null) navigate(`/chat/${ultimaConversacion}`, { replace: true });
  }, []);

  useEffect(() => {
    if (idConversacion != null) ultimaConversacion = idConversacion;
  }, [idConversacion]);

  useEffect(() => {
    borrador = texto;
  }, [texto]);

  // Abrir la conversación de la ruta (o una vacía en /chat).
  useEffect(() => {
    if (idConversacion == null) {
      setMensajes([]);
      return;
    }
    if (recienCreada.current === idConversacion) {
      recienCreada.current = null;
      return;
    }
    let vigente = true;
    setCargando(true);
    setError('');
    window.api
      .obtenerConversacionIA({ idConversacion })
      .then((r) => vigente && setMensajes(r.mensajes))
      .catch((e) => {
        if (!vigente) return;
        setMensajes([]);
        setError(mensajeError(e, 'No se pudo abrir la conversación.'));
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [idConversacion]);

  // La imagen ampliada se cierra con Escape.
  useEffect(() => {
    if (!imagenAmpliada) return;
    const alPresionar = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setImagenAmpliada(null);
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [imagenAmpliada]);

  // El historial se cierra con Escape (si no se está renombrando una conversación).
  useEffect(() => {
    if (!historialAbierto) return;
    const alPresionar = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !renombrando) setHistorialAbierto(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [historialAbierto, renombrando]);

  // El menú de adjuntar se cierra con Escape o tocando afuera.
  useEffect(() => {
    if (!menuAdjuntar) return;
    const alPresionar = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setMenuAdjuntar(false);
    const alTocar = (e: MouseEvent) => {
      if (!menuAdjuntarRef.current?.contains(e.target as Node)) setMenuAdjuntar(false);
    };
    window.addEventListener('keydown', alPresionar);
    window.addEventListener('mousedown', alTocar);
    return () => {
      window.removeEventListener('keydown', alPresionar);
      window.removeEventListener('mousedown', alTocar);
    };
  }, [menuAdjuntar]);

  // Siempre se ve el último mensaje.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, pendiente]);

  // Al abrir otra conversación, el cuadro de texto queda listo para escribir.
  useEffect(() => {
    entradaRef.current?.focus();
  }, [idConversacion]);

  // El cuadro crece con el texto (hasta un máximo; después aparece la barra).
  useEffect(() => {
    const el = entradaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    // La barra de desplazamiento aparece solo cuando el texto ya no entra (si no, se veían las flechitas).
    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
  }, [texto]);

  // Imágenes elegidas, pegadas o arrastradas: se pasan a JPEG chico y quedan como adjuntos del próximo mensaje.
  async function agregarImagenes(archivos: File[]) {
    const imagenes = archivos.filter((a) => a.type.startsWith('image/'));
    if (imagenes.length === 0) return;
    const lugar = MAX_IMAGENES - adjuntos.length;
    if (lugar <= 0) return setError(`Podés adjuntar hasta ${MAX_IMAGENES} imágenes por mensaje.`);
    if (imagenes.length > lugar) setError(`Podés adjuntar hasta ${MAX_IMAGENES} imágenes por mensaje: se agregaron las primeras.`);
    setPreparandoImagen(true);
    try {
      const nuevas = await Promise.all(imagenes.slice(0, lugar).map((a) => imagenAJpeg(a, LADO_MAXIMO_IMAGEN)));
      if (montado.current) setAdjuntos((actuales) => [...actuales, ...nuevas].slice(0, MAX_IMAGENES));
    } catch (e) {
      if (montado.current) setError(mensajeError(e, 'No se pudo leer la imagen.'));
    } finally {
      if (montado.current) setPreparandoImagen(false);
      entradaRef.current?.focus();
    }
  }

  function sumarDocumentos(nuevos: DocumentoChat[], avisos: string[] = []) {
    const lugar = MAX_DOCUMENTOS - documentos.length;
    const avisosFinales = [...avisos];
    if (nuevos.length > lugar) avisosFinales.push(`Podés adjuntar hasta ${MAX_DOCUMENTOS} archivos por mensaje: se agregaron los primeros.`);
    setDocumentos((actuales) => [...actuales, ...nuevos].slice(0, MAX_DOCUMENTOS));
    if (avisosFinales.length) setError(avisosFinales.join(' '));
  }

  // Subir archivo o carpeta de la compu: el diálogo lo abre el main y devuelve el texto leído.
  async function adjuntarDeLaCompu(carpeta: boolean) {
    setMenuAdjuntar(false);
    setLeyendoArchivos(true);
    try {
      const lectura: LecturaAdjuntos | null = await window.api.adjuntarArchivosChat({ carpeta });
      if (lectura && montado.current) sumarDocumentos(lectura.documentos, lectura.avisos);
    } catch (e) {
      if (montado.current) setError(mensajeError(e, 'No se pudieron leer los archivos.'));
    } finally {
      if (montado.current) setLeyendoArchivos(false);
      entradaRef.current?.focus();
    }
  }

  // "Buscar en Syntra": un archivo de Material.
  async function adjuntarDeMaterial(archivo: Archivo) {
    setBuscandoEnSyntra(false);
    setLeyendoArchivos(true);
    try {
      const documento = await window.api.adjuntarMaterialChat({ idArchivo: archivo.id });
      if (montado.current) sumarDocumentos([documento]);
    } catch (e) {
      if (montado.current) setError(mensajeError(e, 'No se pudo leer el archivo.'));
    } finally {
      if (montado.current) setLeyendoArchivos(false);
      entradaRef.current?.focus();
    }
  }

  // Ctrl+V de una captura en el cuadro de texto.
  function alPegar(evento: ClipboardEvent<HTMLTextAreaElement>) {
    const archivos = [...evento.clipboardData.files].filter((a) => a.type.startsWith('image/'));
    if (archivos.length === 0) return;
    evento.preventDefault();
    void agregarImagenes(archivos);
  }

  function alSoltar(evento: DragEvent<HTMLElement>) {
    if (!evento.dataTransfer.files.length) return;
    evento.preventDefault();
    if (!pendiente) void agregarImagenes([...evento.dataTransfer.files]);
  }

  async function enviar(contenido = texto) {
    const pregunta = contenido.trim();
    const imagenes = adjuntos;
    const docs = documentos;
    if ((!pregunta && imagenes.length === 0 && docs.length === 0) || pendiente || preparandoImagen || leyendoArchivos) return;
    const trabajo: Pendiente = { trabajoId: crypto.randomUUID(), texto: pregunta, imagenes, documentos: docs };
    setPendiente(trabajo);
    setTexto('');
    setAdjuntos([]);
    setDocumentos([]);
    setError('');

    // Si se cancela o falla, la pregunta y los adjuntos vuelven al cuadro para editarlos o reenviarlos.
    const devolver = () => {
      setTexto(pregunta);
      setAdjuntos(imagenes);
      setDocumentos(docs);
    };

    try {
      const r = await window.api.enviarMensajeChat({
        trabajoId: trabajo.trabajoId,
        idConversacion,
        texto: pregunta,
        conAgenda,
        ...(imagenes.length ? { imagenes } : {}),
        ...(docs.length ? { documentos: docs } : {}),
      });
      // Aunque haya salido del chat mientras la IA respondía, al volver se abre esta conversación.
      if (r.ok && idConversacion == null) ultimaConversacion = r.conversacion.idConversacion;
      if (!montado.current) return;
      if (!r.ok) {
        devolver();
        return;
      }
      setMensajes((actuales) => [...actuales, ...r.mensajes]);
      setConversaciones((lista) => [r.conversacion, ...lista.filter((c) => c.idConversacion !== r.conversacion.idConversacion)]);
      if (idConversacion == null) {
        recienCreada.current = r.conversacion.idConversacion;
        navigate(`/chat/${r.conversacion.idConversacion}`, { replace: true });
      }
    } catch (e) {
      if (!montado.current) return;
      devolver();
      setError(mensajeError(e, 'La IA no pudo responder. Probá de nuevo en un rato.'));
    } finally {
      if (montado.current) setPendiente(null);
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar();
  }

  // Enter envía; Shift+Enter hace un salto de línea.
  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      void enviar();
    }
  }

  function cancelar() {
    if (pendiente) void window.api.cancelar(pendiente.trabajoId);
  }

  async function guardarTitulo() {
    if (!renombrando) return;
    const titulo = renombrando.titulo.trim();
    const actual = conversaciones.find((c) => c.idConversacion === renombrando.id);
    setRenombrando(null);
    if (!titulo || titulo === actual?.titulo) return;
    try {
      const cambiada = await window.api.renombrarConversacionIA({ idConversacion: renombrando.id, titulo });
      setConversaciones((lista) => lista.map((c) => (c.idConversacion === cambiada.idConversacion ? cambiada : c)));
    } catch (e) {
      setError(mensajeError(e, 'No se pudo cambiar el título.'));
    }
  }

  async function eliminar(conversacion: ConversacionIA) {
    const ok = await confirmar(`¿Eliminar "${conversacion.titulo}"? Se borran todos sus mensajes.`, {
      titulo: 'Eliminar conversación',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await window.api.eliminarConversacionIA({ idConversacion: conversacion.idConversacion });
      setConversaciones((lista) => lista.filter((c) => c.idConversacion !== conversacion.idConversacion));
      if (conversacion.idConversacion === ultimaConversacion) ultimaConversacion = null;
      if (conversacion.idConversacion === idConversacion) navigate('/chat');
    } catch (e) {
      setError(mensajeError(e, 'No se pudo eliminar la conversación.'));
    }
  }

  async function copiar(mensaje: MensajeIA) {
    try {
      await navigator.clipboard.writeText(mensaje.texto);
      setCopiado(mensaje.idMensaje);
      setTimeout(() => montado.current && setCopiado(null), 1500);
    } catch {
      setError('No se pudo copiar la respuesta.');
    }
  }

  function nuevaConversacion() {
    ultimaConversacion = null;
    setTexto('');
    setAdjuntos([]);
    setDocumentos([]);
    setError('');
    setHistorialAbierto(false);
    if (idConversacion != null) navigate('/chat');
    else entradaRef.current?.focus();
  }

  function abrirConversacion(id: number) {
    setHistorialAbierto(false);
    setDocumentos([]);
    navigate(`/chat/${id}`);
  }

  const ocupado = pendiente !== null;
  const vacia = !cargando && mensajes.length === 0 && !pendiente;
  // Los brillitos pasan del centro a la barra de arriba en cuanto se empieza a escribir.
  const iniciada = !vacia || texto.trim().length > 0 || adjuntos.length > 0 || documentos.length > 0;
  const puedeEnviar = (texto.trim().length > 0 || adjuntos.length > 0 || documentos.length > 0) && !preparandoImagen && !leyendoArchivos;
  const textoMicrofono = {
    inactivo: 'Dictar con el micrófono',
    preparando: dictado.progreso != null
      ? `Descargando el dictado (solo la primera vez): ${Math.round(dictado.progreso * 100)}%`
      : 'Preparando el dictado…',
    grabando: 'Terminar de dictar',
    transcribiendo: 'Pasando la voz a texto…',
  }[dictado.estado];

  return (
    <PlantillaLayout titulo="IA" idActivo="chat" usuario={{ nombre: 'Usuario' }}>
      <div className="chat-ia">
        <div className="chat-ia__barra">
          <button
            type="button"
            className="chat-ia__icono-boton chat-ia__boton-conversaciones"
            onClick={() => setHistorialAbierto((v) => !v)}
            title={historialAbierto ? 'Ocultar conversaciones' : 'Ver conversaciones anteriores'}
            aria-expanded={historialAbierto}
            aria-controls="chat-ia-historial"
          >
            {historialAbierto ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            <span>Conversaciones</span>
          </button>
          {iniciada && (
            <button
              type="button"
              className="chat-ia__icono-boton chat-ia__brillitos-barra"
              onClick={nuevaConversacion}
              disabled={ocupado}
              title="Nueva conversación"
              aria-label="Nueva conversación"
            >
              <Sparkles size={19} />
            </button>
          )}
        </div>

        {historialAbierto && (
          <>
            <div className="chat-ia__fondo" onClick={() => setHistorialAbierto(false)} />
            <aside id="chat-ia-historial" className="chat-ia__historial" aria-label="Conversaciones anteriores">
              <header className="chat-ia__historial-cabecera">
                <h2>Conversaciones</h2>
                <button
                  type="button"
                  className="chat-ia__icono-boton"
                  onClick={() => setHistorialAbierto(false)}
                  title="Cerrar"
                  aria-label="Cerrar conversaciones"
                >
                  <X size={18} />
                </button>
              </header>
              {conversaciones.length ? (
                <ul className="chat-ia__lista">
                  {conversaciones.map((c) => {
                    const activa = c.idConversacion === idConversacion;
                    if (renombrando?.id === c.idConversacion) {
                      return (
                        <li key={c.idConversacion} className="chat-ia__item chat-ia__item--activa">
                          <input
                            className="chat-ia__renombrar"
                            value={renombrando.titulo}
                            maxLength={120}
                            autoFocus
                            aria-label="Título de la conversación"
                            onChange={(e) => setRenombrando({ id: c.idConversacion, titulo: e.target.value })}
                            onBlur={() => void guardarTitulo()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void guardarTitulo();
                              if (e.key === 'Escape') setRenombrando(null);
                            }}
                          />
                        </li>
                      );
                    }
                    return (
                      <li key={c.idConversacion} className={`chat-ia__item${activa ? ' chat-ia__item--activa' : ''}`}>
                        <button
                          type="button"
                          className="chat-ia__abrir"
                          onClick={() => abrirConversacion(c.idConversacion)}
                          disabled={ocupado && !activa}
                          aria-current={activa ? 'page' : undefined}
                        >
                          <span className="chat-ia__titulo">{c.titulo}</span>
                          <small>{formatearDia(c.fechaActualizacion)}</small>
                        </button>
                        <span className="chat-ia__item-acciones">
                          <button
                            type="button"
                            title="Cambiar título"
                            aria-label={`Cambiar título de ${c.titulo}`}
                            onClick={() => setRenombrando({ id: c.idConversacion, titulo: c.titulo })}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Eliminar"
                            aria-label={`Eliminar ${c.titulo}`}
                            onClick={() => void eliminar(c)}
                            disabled={ocupado && activa}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="chat-ia__sin-conversaciones">Tus conversaciones van a aparecer acá.</p>
              )}
            </aside>
          </>
        )}

        <section className="chat-ia__principal" onDragOver={(e) => e.preventDefault()} onDrop={alSoltar}>
          {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

          <div className="chat-ia__mensajes" aria-live="polite">
            {cargando && <p className="chat-ia__estado" role="status">Cargando conversación…</p>}

            {vacia && (
              <div className="chat-ia__bienvenida">
                {!iniciada && <span className="chat-ia__bienvenida-icono"><Sparkles size={26} /></span>}
                <h2>¿Por dónde empezamos?</h2>
                <p>Preguntá lo que quieras: dudas de un tema, ejercicios, cómo organizarte para estudiar…</p>
                <div className="chat-ia__sugerencias">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" onClick={() => { setTexto(s); entradaRef.current?.focus(); }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((m) =>
              m.rol === 'usuario' ? (
                <div key={m.idMensaje} className="chat-ia__burbuja chat-ia__burbuja--usuario">
                  <ImagenesMensaje imagenes={m.imagenes} onAmpliar={setImagenAmpliada} />
                  {m.texto}
                </div>
              ) : (
                <div key={m.idMensaje} className="chat-ia__respuesta">
                  <TextoConFormulas className="chat-ia__texto" texto={m.texto} />
                  <div className="chat-ia__respuesta-pie">
                    <button type="button" onClick={() => void copiar(m)} title="Copiar respuesta">
                      {copiado === m.idMensaje ? <Check size={14} /> : <Copy size={14} />}
                      {copiado === m.idMensaje ? 'Copiado' : 'Copiar'}
                    </button>
                    {m.proveedor && <small>Respondió {nombreProveedorIA(m.proveedor)}</small>}
                  </div>
                </div>
              ),
            )}

            {pendiente && (
              <>
                <div className="chat-ia__burbuja chat-ia__burbuja--usuario">
                  <ImagenesMensaje imagenes={pendiente.imagenes} onAmpliar={setImagenAmpliada} />
                  {[pendiente.texto, pendiente.documentos.length ? `📎 ${pendiente.documentos.map((d) => d.nombre).join(', ')}` : '']
                    .filter(Boolean)
                    .join('\n')}
                </div>
                <div className="chat-ia__respuesta chat-ia__respuesta--pensando" role="status">
                  <span className="chat-ia__puntos" aria-hidden="true"><i /><i /><i /></span>
                  Pensando…
                </div>
              </>
            )}
            <div ref={finRef} />
          </div>

          {(adjuntos.length > 0 || preparandoImagen || documentos.length > 0 || leyendoArchivos) && (
            <div className="chat-ia__adjuntos" aria-label="Adjuntos para enviar">
              {documentos.map((d, i) => (
                <span key={`${d.nombre}-${i}`} className="chat-ia__documento" title={d.nombre}>
                  <FileText size={15} aria-hidden="true" />
                  <span className="chat-ia__documento-nombre">{d.nombre}</span>
                  <button
                    type="button"
                    onClick={() => setDocumentos((actuales) => actuales.filter((_, j) => j !== i))}
                    title="Quitar archivo"
                    aria-label={`Quitar ${d.nombre}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {leyendoArchivos && <span className="chat-ia__documento chat-ia__adjunto--cargando" role="status">Leyendo archivos…</span>}
              {adjuntos.map((imagen, i) => (
                <span key={i} className="chat-ia__adjunto">
                  <img src={imagenComoSrc(imagen)} alt={`Imagen ${i + 1} para enviar`} />
                  <button
                    type="button"
                    onClick={() => setAdjuntos((actuales) => actuales.filter((_, j) => j !== i))}
                    title="Quitar imagen"
                    aria-label={`Quitar imagen ${i + 1}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {preparandoImagen && <span className="chat-ia__adjunto chat-ia__adjunto--cargando" role="status">Cargando…</span>}
            </div>
          )}

          {dictado.estado !== 'inactivo' && (
            <p className="chat-ia__estado-dictado" aria-hidden="true">
              {dictado.estado === 'grabando' ? <span className="chat-ia__punto-grabando" /> : <LoaderCircle size={14} className="chat-ia__girando" />}
              {dictado.estado === 'grabando' ? 'Escuchando… apretá el cuadrado para terminar' : textoMicrofono}
              {dictado.estado === 'preparando' && dictado.progreso != null && (
                <span className="chat-ia__barra-dictado"><span style={{ width: `${Math.round(dictado.progreso * 100)}%` }} /></span>
              )}
            </p>
          )}

          <div className="chat-ia__opciones">
            <button
              type="button"
              className={`chat-ia__agenda${conAgenda ? ' chat-ia__agenda--activa' : ''}`}
              aria-pressed={conAgenda}
              onClick={() => setConAgenda((v) => !v)}
              title={conAgenda
                ? 'La IA ve tus clases, eventos, sesiones, tareas y material para ayudarte a organizarte. Tocá para apagarlo.'
                : 'La IA no ve tu agenda. Tocá para que pueda usarla.'}
            >
              <CalendarDays size={14} aria-hidden="true" />
              {conAgenda ? 'Usa tu agenda' : 'Sin tu agenda'}
            </button>
          </div>

          <form className="chat-ia__entrada" onSubmit={alEnviar}>
            <textarea
              ref={entradaRef}
              value={texto}
              rows={1}
              maxLength={8000}
              placeholder={adjuntos.length ? "Preguntá algo sobre la imagen…" : "Escribí tu pregunta…"}
              aria-label="Mensaje para la IA"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={alTeclear}
              onPaste={alPegar}
              disabled={cargando}
            />
            <div className="chat-ia__menu-contenedor" ref={menuAdjuntarRef}>
              <button
                type="button"
                className="chat-ia__adjuntar"
                onClick={() => setMenuAdjuntar((v) => !v)}
                disabled={ocupado || cargando || leyendoArchivos}
                title="Adjuntar"
                aria-label="Adjuntar archivo, carpeta o foto"
                aria-haspopup="menu"
                aria-expanded={menuAdjuntar}
              >
                <Plus size={20} />
              </button>
              {menuAdjuntar && (
                <div className="chat-ia__menu" role="menu" aria-label="Adjuntar" data-voz-grupo>
                  <button type="button" role="menuitem" className="chat-ia__menu-opcion" autoFocus onClick={() => void adjuntarDeLaCompu(false)}>
                    <FileUp size={17} /> Subir archivo
                  </button>
                  <button type="button" role="menuitem" className="chat-ia__menu-opcion" onClick={() => void adjuntarDeLaCompu(true)}>
                    <FolderUp size={17} /> Subir carpeta
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="chat-ia__menu-opcion"
                    onClick={() => {
                      setMenuAdjuntar(false);
                      setBuscandoEnSyntra(true);
                    }}
                  >
                    <Search size={17} /> Buscar en Syntra
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="chat-ia__menu-opcion"
                    disabled={adjuntos.length >= MAX_IMAGENES}
                    title={adjuntos.length >= MAX_IMAGENES ? `Hasta ${MAX_IMAGENES} imágenes por mensaje` : undefined}
                    onClick={() => {
                      setMenuAdjuntar(false);
                      entradaImagenRef.current?.click();
                    }}
                  >
                    <ImagePlus size={17} /> Subir foto
                  </button>
                </div>
              )}
            </div>
            <input
              ref={entradaImagenRef}
              type="file"
              accept={TIPOS_IMAGEN_ACEPTADOS}
              multiple
              hidden
              onChange={(e) => {
                const archivos = [...(e.target.files ?? [])];
                e.target.value = '';
                void agregarImagenes(archivos);
              }}
            />
            <button
              type="button"
              className={`chat-ia__adjuntar chat-ia__microfono${dictado.estado === 'grabando' ? ' chat-ia__microfono--grabando' : ''}`}
              onClick={() => void dictado.alternar()}
              disabled={ocupado || cargando || dictado.estado === 'preparando' || dictado.estado === 'transcribiendo'}
              title={textoMicrofono}
              aria-label={textoMicrofono}
              aria-pressed={dictado.estado === 'grabando'}
            >
              {dictado.estado === 'preparando' || dictado.estado === 'transcribiendo'
                ? <LoaderCircle size={19} className="chat-ia__girando" />
                : dictado.estado === 'grabando' ? <Square size={15} /> : <Mic size={19} />}
            </button>
            {ocupado ? (
              <button type="button" className="chat-ia__boton chat-ia__boton--cancelar" onClick={cancelar} title="Detener respuesta" aria-label="Detener respuesta">
                <Square size={16} />
              </button>
            ) : (
              <button type="submit" className="chat-ia__boton" disabled={!puedeEnviar || cargando} title="Enviar" aria-label="Enviar">
                <SendHorizontal size={18} />
              </button>
            )}
          </form>
          <p className="chat-ia__ayuda">
            <MessageCircle size={13} /> Enter para enviar · Shift + Enter para un salto de línea · Con + adjuntás archivos, carpetas o fotos · Con el micrófono dictás. La IA puede equivocarse: revisá lo importante.
          </p>
          {/* Para lectores de pantalla: qué está pasando con el micrófono. */}
          <p className="chat-ia__solo-lector" role="status" aria-live="polite">
            {dictado.estado === 'grabando' ? 'Escuchando. Apretá de nuevo el micrófono para terminar.' : dictado.estado === 'inactivo' ? '' : textoMicrofono}
          </p>
        </section>
      </div>

      {buscandoEnSyntra && <ModalAbrirMaterial onElegir={(a) => void adjuntarDeMaterial(a)} onCerrar={() => setBuscandoEnSyntra(false)} />}

      {imagenAmpliada && (
        <div className="chat-ia__ampliada" role="dialog" aria-label="Imagen ampliada" onClick={() => setImagenAmpliada(null)}>
          <img src={imagenComoSrc(imagenAmpliada)} alt="Imagen adjunta" />
        </div>
      )}
    </PlantillaLayout>
  );
}

// Miniaturas de las imágenes que el usuario adjuntó a un mensaje; al tocarlas se ven grandes.
function ImagenesMensaje({ imagenes, onAmpliar }: { imagenes: string[]; onAmpliar: (imagen: string) => void }) {
  if (imagenes.length === 0) return null;
  return (
    <span className="chat-ia__imagenes">
      {imagenes.map((imagen, i) => (
        <button key={i} type="button" onClick={() => onAmpliar(imagen)} title="Ver imagen" aria-label={`Ver imagen ${i + 1}`}>
          <img src={imagenComoSrc(imagen)} alt={`Imagen adjunta ${i + 1}`} />
        </button>
      ))}
    </span>
  );
}
