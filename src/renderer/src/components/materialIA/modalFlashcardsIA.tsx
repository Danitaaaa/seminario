// src/renderer/src/components/materialIA/modalFlashcardsIA.tsx
// Flashcards con IA: elegir uno o varios archivos + indicaciones → la IA propone tarjetas → se revisan/editan/quitan
// → se crea un mazo NUEVO y se guardan ahí. Usa las mismas funciones de siempre (crearDeck / crearFlashcard).
// Con varios archivos se genera de a uno (la cola de IA ya trabaja así) y las tarjetas se juntan en una sola revisión.
import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button/button';
import { CartelError } from '../comunes/cartelError';
import { LARGO_PREGUNTA, LARGO_RESPUESTA } from '../../utils/formulas';
import { api, nuevoTrabajoIA, type ArchivoMaterial } from '../../utils/apiMaterialIA';
import type { TarjetaIA } from '../../../../preload/apis/materialIA';
import { SelectorMateriales } from './selectorMateriales';
import { ModalGenerando } from './modalGenerando';
import styles from '../../styles/flashcards.module.css';

interface Props {
  archivos: ArchivoMaterial[];
  cargandoArchivos?: boolean;
  idArchivoInicial?: number;
  onCerrar: () => void;
  /** Se llama al terminar de guardar, con el id del mazo nuevo (para recargar la lista o abrirlo). */
  onGuardado?: (idDeck: number) => void;
}

type Paso = 'configurar' | 'generando' | 'revisar' | 'guardando';

function usuarioIdActual(): number {
  const id = Number(localStorage.getItem('usuarioId'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('No se encontró una sesión válida. Volvé a iniciar sesión.');
  return id;
}

// Convierte cualquier error (incluido el de IPC "Error invoking remote method ...") en un mensaje legible.
function mensajeDe(e: unknown, porDefecto: string): string {
  if (!(e instanceof Error) || !e.message) return porDefecto;
  const limpio = e.message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').trim();
  return limpio || porDefecto;
}

export function ModalFlashcardsIA({ archivos, cargandoArchivos = false, idArchivoInicial, onCerrar, onGuardado }: Props) {
  const [paso, setPaso] = useState<Paso>('configurar');
  const [idsArchivos, setIdsArchivos] = useState<number[]>(idArchivoInicial ? [idArchivoInicial] : []);
  const [cantidad, setCantidad] = useState(15);
  const [indicaciones, setIndicaciones] = useState('');
  const [nombreMazo, setNombreMazo] = useState('');
  const [tarjetas, setTarjetas] = useState<TarjetaIA[]>([]);
  const [avance, setAvance] = useState(0);
  const [error, setError] = useState('');
  const trabajo = useRef<ReturnType<typeof nuevoTrabajoIA> | null>(null);
  const trabajosGenerados = useRef<string[]>([]);
  // Cada generación toma un número. Si cancelás o cerrás, el número cambia y la generación vieja
  // ignora lo que le llegue después (así el cancelar responde al instante).
  const corrida = useRef(0);

  const invalida = (t: TarjetaIA) =>
    !t.pregunta.trim() || !t.respuesta.trim() || t.pregunta.length > LARGO_PREGUNTA || t.respuesta.length > LARGO_RESPUESTA;
  const hayInvalidas = tarjetas.some(invalida);

  function descartarPropuestas() {
    for (const trabajoId of trabajosGenerados.current) {
      // Si el canal no existe o falla, no tiene que romper el cierre del modal.
      try {
        void Promise.resolve(api().descartarPropuestaIA({ trabajoId })).catch(() => undefined);
      } catch {
        /* nada */
      }
    }
    trabajosGenerados.current = [];
  }

  // Botón "Cancelar generación": invalida la corrida, avisa al main y vuelve a configurar sin esperar respuesta.
  function cancelarGeneracion() {
    corrida.current++;
    const t = trabajo.current;
    trabajo.current = null;
    try {
      void Promise.resolve(t?.cancelar()).catch(() => undefined);
    } catch {
      /* nada */
    }
    descartarPropuestas();
    setPaso('configurar');
  }

  async function generar() {
    if (!idsArchivos.length) return setError('Elegí al menos un archivo de Material.');
    setError('');

    // Si el preload no expone la función, se avisa en vez de quedarse sin hacer nada.
    if (typeof api()?.generarFlashcardsIA !== 'function') {
      return setError(
        'La función de IA no está disponible. Falta exponer "materialIAExtraApi" en el preload y reiniciar la app.',
      );
    }

    setPaso('generando');
    setAvance(0);
    const miCorrida = ++corrida.current;
    // La cantidad es el total aproximado: se reparte entre los archivos.
    const porArchivo = Math.max(3, Math.ceil(cantidad / idsArchivos.length));
    const juntas: TarjetaIA[] = [];
    let nombreBase = '';
    try {
      for (const [i, idArchivo] of idsArchivos.entries()) {
        setAvance(i);
        trabajo.current = nuevoTrabajoIA();
        const r = await api().generarFlashcardsIA({
          trabajoId: trabajo.current.id,
          idArchivo,
          cantidad: porArchivo,
          ...(indicaciones.trim() ? { indicaciones: indicaciones.trim() } : {}),
        });

        // Canceló mientras esperaba: se ignora el resultado y se descarta la propuesta si llegó una.
        if (miCorrida !== corrida.current) {
          if (r.ok) void Promise.resolve(api().descartarPropuestaIA({ trabajoId: r.trabajoId })).catch(() => undefined);
          return;
        }

        if (!r.ok) {
          descartarPropuestas();
          // Solo es silencioso si el usuario canceló; cualquier otro fallo se muestra.
          const cancelado = 'cancelado' in r && r.cancelado === true;
          if (!cancelado) {
            const mensaje = 'mensaje' in r && typeof (r as { mensaje?: unknown }).mensaje === 'string'
              ? (r as { mensaje: string }).mensaje
              : 'La IA no pudo generar las flashcards. Probá de nuevo en un rato.';
            setError(mensaje);
          }
          return setPaso('configurar');
        }

        trabajosGenerados.current.push(r.trabajoId);
        if (i === 0) nombreBase = r.nombreMazo;
        juntas.push(...r.tarjetas);
      }

      if (juntas.length === 0) {
        descartarPropuestas();
        setError('La IA no devolvió tarjetas para ese material. Probá con otras indicaciones o con otro archivo.');
        return setPaso('configurar');
      }

      const extra = idsArchivos.length - 1;
      setNombreMazo((extra > 0 ? `${nombreBase} y ${extra} más` : nombreBase).slice(0, 50));
      setTarjetas(juntas);
      setPaso('revisar');
    } catch (e) {
      // Si canceló, el abort puede llegar como error: no se muestra.
      if (miCorrida !== corrida.current) return;
      descartarPropuestas();
      setError(mensajeDe(e, 'No se pudieron generar las flashcards.'));
      setPaso('configurar');
    } finally {
      if (miCorrida === corrida.current) trabajo.current = null;
    }
  }

  const cambiar = (i: number, campo: 'pregunta' | 'respuesta', valor: string) =>
    setTarjetas((lista) => lista.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));

  // El nombre del mazo puede estar repetido: se prueba "Nombre", "Nombre (2)", "Nombre (3)"…
  async function crearMazo(usuarioId: number, base: string): Promise<number> {
    let ultimoError: unknown;
    for (let n = 1; n <= 5; n++) {
      const sufijo = n === 1 ? '' : ` (${n})`;
      const nombre = `${base.slice(0, 50 - sufijo.length).trim()}${sufijo}`;
      try {
        const creado = await api().crearDeck({ usuarioId, nombre });
        if (creado?.idDeck) return creado.idDeck;
        const mazos = await api().listarDecks(usuarioId);
        const nuevo = mazos.filter((m) => m.nombre === nombre).sort((a, b) => b.idDeck - a.idDeck)[0];
        if (nuevo) return nuevo.idDeck;
        throw new Error('No se pudo crear el mazo.');
      } catch (e) {
        ultimoError = e;
      }
    }
    throw ultimoError instanceof Error ? ultimoError : new Error('No se pudo crear el mazo.');
  }

  async function guardar() {
    const base = nombreMazo.trim();
    if (!base) return setError('Poné un nombre para el mazo.');
    if (!tarjetas.length) return setError('No quedó ninguna tarjeta para guardar.');
    if (hayInvalidas) return setError('Hay tarjetas vacías o demasiado largas. Corregilas o quitalas.');
    setError('');
    setPaso('guardando');
    setAvance(0);
    let idDeck: number | null = null;
    try {
      const usuarioId = usuarioIdActual();
      idDeck = await crearMazo(usuarioId, base);
      for (const [i, t] of tarjetas.entries()) {
        await api().crearFlashcard({ usuarioId, deckId: idDeck, pregunta: t.pregunta.trim(), respuesta: t.respuesta.trim() });
        setAvance(i + 1);
      }
      descartarPropuestas();
      onGuardado?.(idDeck);
      onCerrar();
    } catch (e) {
      const detalle = mensajeDe(e, 'No se pudieron guardar las flashcards.');
      setError(idDeck ? `${detalle} El mazo se creó con las tarjetas guardadas hasta ahora; podés completarlo a mano.` : detalle);
      setPaso('revisar');
    }
  }

  function cerrar() {
    // Invalida la generación en curso para que un resultado tardío no deje propuestas colgadas.
    corrida.current++;
    void trabajo.current?.cancelar();
    if (paso !== 'guardando') descartarPropuestas();
    onCerrar();
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="fc-ia-titulo" style={paso === 'revisar' ? { width: 'min(820px, 95vw)', maxHeight: '90vh', overflowY: 'auto' } : { maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 id="fc-ia-titulo">Crear flashcards con IA</h2>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {paso === 'configurar' && (
          <>
            <label>Material (podés elegir varios archivos)</label>
            <SelectorMateriales archivos={archivos} seleccionados={idsArchivos} onCambiar={setIdsArchivos} cargando={cargandoArchivos} />
            <label htmlFor="fc-cantidad">Cantidad aproximada de tarjetas (en total)</label>
            <input id="fc-cantidad" type="number" min={3} max={50} value={cantidad} onChange={(e) => setCantidad(Math.min(50, Math.max(3, Number(e.target.value) || 3)))} />
            <label htmlFor="fc-indicaciones">Indicaciones para la IA (opcional)</label>
            <textarea id="fc-indicaciones" rows={3} maxLength={1800} placeholder='Ej. "solo definiciones", "enfocate en fórmulas"' value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
            <p className={styles.formulaHint}>Se crea un mazo nuevo. Antes de guardarlo podés editar o quitar tarjetas.</p>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
              <Button onClick={() => void generar()} disabled={idsArchivos.length === 0}>Generar</Button>
            </div>
          </>
        )}

        {paso === 'generando' && (
          <ModalGenerando
            mensaje="Generando flashcards"
            detalle={idsArchivos.length > 1
              ? `Archivo ${Math.min(avance + 1, idsArchivos.length)} de ${idsArchivos.length} · puede tardar un poco`
              : 'Puede tardar un poco según el tamaño del material.'}
            onCancelar={cancelarGeneracion}
          />
        )}

        {(paso === 'revisar' || paso === 'guardando') && (
          <>
            <label htmlFor="fc-mazo">Nombre del mazo</label>
            <input id="fc-mazo" value={nombreMazo} maxLength={50} disabled={paso === 'guardando'} onChange={(e) => setNombreMazo(e.target.value)} />
            <p className={styles.description}>{tarjetas.length} {tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'}. Editá o quitá las que no te sirvan antes de guardar.</p>
            <div className={styles.cardList}>
              {tarjetas.map((t, i) => (
                <div key={i} className={styles.createForm}>
                  <label htmlFor={`fc-p-${i}`}>Pregunta {i + 1}</label>
                  <input id={`fc-p-${i}`} value={t.pregunta} disabled={paso === 'guardando'} aria-invalid={t.pregunta.length > LARGO_PREGUNTA} onChange={(e) => cambiar(i, 'pregunta', e.target.value)} />
                  <label htmlFor={`fc-r-${i}`}>Respuesta</label>
                  <textarea id={`fc-r-${i}`} rows={3} value={t.respuesta} disabled={paso === 'guardando'} aria-invalid={t.respuesta.length > LARGO_RESPUESTA} onChange={(e) => cambiar(i, 'respuesta', e.target.value)} />
                  {t.fuente && <small title={t.fuente}>Del material: “{t.fuente.slice(0, 120)}{t.fuente.length > 120 ? '…' : ''}”</small>}
                  <div className={styles.formActions}>
                    <Button variant="secondary" disabled={paso === 'guardando'} onClick={() => setTarjetas((l) => l.filter((_, j) => j !== i))}>
                      <Trash2 size={15} /> Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar} disabled={paso === 'guardando'}>Descartar</Button>
              <Button onClick={() => void guardar()} disabled={paso === 'guardando' || !tarjetas.length || hayInvalidas}>
                {paso === 'guardando' ? `Guardando ${avance} de ${tarjetas.length}…` : 'Crear mazo y guardar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}