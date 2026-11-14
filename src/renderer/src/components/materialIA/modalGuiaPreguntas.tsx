// src/renderer/src/components/materialIA/modalGuiaPreguntas.tsx
// Guía de preguntas con IA: elegir uno o varios archivos + indicaciones → la IA genera → se corrige en el editor
// → se guarda como .docx en la carpeta "guia" de Material (se crea si no existe).
// Con varios archivos se genera de a uno y se juntan en un solo documento, con un título por archivo.
import { useRef, useState } from 'react';
import { Button } from '../ui/button/button';
import { CartelError } from '../comunes/cartelError';
import { api, nuevoTrabajoIA, type ArchivoMaterial } from '../../utils/apiMaterialIA';
import { EditorGuia } from './editorGuia';
import { SelectorMateriales } from './selectorMateriales';
import { ModalGenerando } from './modalGenerando';
import styles from '../../styles/flashcards.module.css';

interface Props {
  /** Archivos de Material entre los que se puede elegir (los que tengan texto: pdf, docx, txt…). */
  archivos: ArchivoMaterial[];
  cargandoArchivos?: boolean;
  /** Si se abre desde un archivo concreto, ya viene elegido. */
  idArchivoInicial?: number;
  onCerrar: () => void;
  onGuardada?: (archivo: { id: number; nombre: string }) => void;
}

type Paso = 'configurar' | 'generando' | 'corregir' | 'guardada';

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function ModalGuiaPreguntas({ archivos, cargandoArchivos = false, idArchivoInicial, onCerrar, onGuardada }: Props) {
  const [paso, setPaso] = useState<Paso>('configurar');
  const [idsArchivos, setIdsArchivos] = useState<number[]>(idArchivoInicial ? [idArchivoInicial] : []);
  const [cantidad, setCantidad] = useState(10);
  const [indicaciones, setIndicaciones] = useState('');
  const [html, setHtml] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [avance, setAvance] = useState(0);
  const [error, setError] = useState('');
  const trabajo = useRef<ReturnType<typeof nuevoTrabajoIA> | null>(null);
  const trabajosGenerados = useRef<string[]>([]);
  // Cada generación toma un número. Si cancelás o cerrás, el número cambia y la generación vieja
  // ignora lo que le llegue después (así el cancelar responde al instante).
  const corrida = useRef(0);

  function descartarPropuestas() {
    for (const trabajoId of trabajosGenerados.current) {
      // Si el canal falla, no tiene que romper el cancelar ni el cierre del modal.
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
    setPaso('generando');
    setAvance(0);
    const miCorrida = ++corrida.current;
    // La cantidad es el total aproximado: se reparte entre los archivos.
    const porArchivo = Math.max(3, Math.ceil(cantidad / idsArchivos.length));
    const partes: { nombreArchivo: string; html: string }[] = [];
    try {
      for (const [i, idArchivo] of idsArchivos.entries()) {
        setAvance(i);
        trabajo.current = nuevoTrabajoIA();
        const r = await api().generarGuiaPreguntas({
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
          return setPaso('configurar'); // canceló
        }
        trabajosGenerados.current.push(r.trabajoId);
        partes.push({ nombreArchivo: r.nombreArchivo, html: r.html });
      }
      if (partes.length === 1) {
        setHtml(partes[0].html);
        setNombre(partes[0].nombreArchivo);
      } else {
        setHtml(partes.map((p) => `<h2>${escapar(p.nombreArchivo)}</h2>${p.html}`).join(''));
        setNombre(`Guía de preguntas (${partes.length} materiales)`);
      }
      setPaso('corregir');
    } catch (e) {
      // Si canceló, el abort puede llegar como error: no se muestra.
      if (miCorrida !== corrida.current) return;
      descartarPropuestas();
      setError(e instanceof Error ? e.message : 'No se pudo generar la guía.');
      setPaso('configurar');
    } finally {
      if (miCorrida === corrida.current) trabajo.current = null;
    }
  }

  async function guardar(htmlCorregido: string) {
    if (!nombre.trim()) return setError('Poné un nombre para el documento.');
    try {
      setGuardando(true);
      setError('');
      const r = await api().guardarGuiaPreguntas({
        ...(trabajosGenerados.current[0] ? { trabajoId: trabajosGenerados.current[0] } : {}),
        nombre: nombre.trim(),
        html: htmlCorregido,
      });
      // Las demás propuestas ya no sirven (la primera la descarta el guardado).
      for (const id of trabajosGenerados.current.slice(1)) void api().descartarPropuestaIA({ trabajoId: id });
      trabajosGenerados.current = [];
      onGuardada?.(r.archivo);
      setPaso('guardada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el documento.');
    } finally {
      setGuardando(false);
    }
  }

  function cerrar() {
    // Invalida la generación en curso para que un resultado tardío no deje propuestas colgadas.
    corrida.current++;
    void trabajo.current?.cancelar();
    if (paso !== 'guardada') descartarPropuestas();
    onCerrar();
  }

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-ia-titulo"
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          ...(paso === 'corregir' ? { width: 'min(960px, 95vw)' } : {}),
        }}
      >
        <h2 id="guia-ia-titulo">Guía de preguntas con IA</h2>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {paso === 'configurar' && (
          <>
            <label>Material (podés elegir varios archivos)</label>
            <SelectorMateriales archivos={archivos} seleccionados={idsArchivos} onCambiar={setIdsArchivos} cargando={cargandoArchivos} />
            <label htmlFor="guia-cantidad">Cantidad aproximada de preguntas (en total)</label>
            <input id="guia-cantidad" type="number" min={3} max={30} value={cantidad} onChange={(e) => setCantidad(Math.min(30, Math.max(3, Number(e.target.value) || 3)))} />
            <label htmlFor="guia-indicaciones">Indicaciones para la IA (opcional)</label>
            <textarea id="guia-indicaciones" rows={3} maxLength={1800} placeholder='Ej. "nivel parcial", "enfocate en la unidad 2", "preguntas más cortas"' value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
              <Button onClick={() => void generar()} disabled={idsArchivos.length === 0}>Generar guía</Button>
            </div>
          </>
        )}

        {paso === 'generando' && (
          <ModalGenerando
            mensaje="Generando la guía de preguntas"
            detalle={idsArchivos.length > 1
              ? `Archivo ${Math.min(avance + 1, idsArchivos.length)} de ${idsArchivos.length} · puede tardar un poco`
              : 'Puede tardar un poco según el tamaño del material.'}
            onCancelar={cancelarGeneracion}
          />
        )}

        {paso === 'corregir' && (
          <>
            <p className={styles.description}>Revisá y corregí las preguntas y las respuestas del final. Al guardar se crea un Word en la carpeta "guia" de Material.</p>
            <label htmlFor="guia-nombre">Nombre del documento</label>
            <input id="guia-nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} />
            <EditorGuia html={html} guardando={guardando} onGuardar={guardar} />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar} disabled={guardando}>Descartar</Button>
            </div>
          </>
        )}

        {paso === 'guardada' && (
          <>
            <p className={styles.notice} role="status">Listo: la guía se guardó en la carpeta "guia" de Material como documento Word.</p>
            <div className={styles.modalActions}><Button onClick={onCerrar}>Cerrar</Button></div>
          </>
        )}
      </div>
    </div>
  );
}