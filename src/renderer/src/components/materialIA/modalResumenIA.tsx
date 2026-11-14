// src/renderer/src/components/materialIA/modalResumenIA.tsx
// Resumen con IA, igual que la guía de preguntas: elegir uno o varios archivos + indicaciones → la IA genera
// → se corrige en el editor → se guarda como .docx en la carpeta "Resúmenes" de Material (se crea si no existe).
// Con varios archivos se genera de a uno y se juntan en un solo documento.
import { useRef, useState } from 'react';
import { Button } from '../ui/button/button';
import { CartelError } from '../comunes/cartelError';
import { nuevoTrabajoIA, type ArchivoMaterial } from '../../utils/apiMaterialIA';
import { mensajeError } from '../../pages/metodos/utilidadesMetodosIA';
import { EditorGuia } from './editorGuia';
import { SelectorMateriales } from './selectorMateriales';
import { ModalGenerando } from './modalGenerando';
import styles from '../../styles/flashcards.module.css';

interface Props {
  archivos: ArchivoMaterial[];
  cargandoArchivos?: boolean;
  onCerrar: () => void;
  onGuardado?: (archivo: { id: number; nombre: string }) => void;
}

type Paso = 'configurar' | 'generando' | 'corregir' | 'guardado';

export function ModalResumenIA({ archivos, cargandoArchivos = false, onCerrar, onGuardado }: Props) {
  const [paso, setPaso] = useState<Paso>('configurar');
  const [idsArchivos, setIdsArchivos] = useState<number[]>([]);
  const [indicaciones, setIndicaciones] = useState('');
  const [html, setHtml] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [avance, setAvance] = useState(0);
  const [error, setError] = useState('');
  const trabajo = useRef<ReturnType<typeof nuevoTrabajoIA> | null>(null);
  // Las propuestas que quedaron en el main (una por archivo): se liberan al guardar o al descartar.
  const trabajosGenerados = useRef<string[]>([]);
  // Si se cancela o se cierra, el número cambia y la generación vieja ignora lo que le llegue después.
  const corrida = useRef(0);

  function descartarPropuestas() {
    for (const trabajoId of trabajosGenerados.current) {
      void Promise.resolve(window.api.descartarMaterialIA({ trabajoId })).catch(() => undefined);
    }
    trabajosGenerados.current = [];
  }

  function cancelarGeneracion() {
    corrida.current++;
    void trabajo.current?.cancelar();
    trabajo.current = null;
    descartarPropuestas();
    setPaso('configurar');
  }

  async function generar() {
    if (!idsArchivos.length) return setError('Elegí al menos un archivo de Material.');
    setError('');
    setPaso('generando');
    setAvance(0);
    const miCorrida = ++corrida.current;
    const partes: { nombreArchivo: string; html: string }[] = [];
    try {
      for (const [i, idArchivo] of idsArchivos.entries()) {
        setAvance(i);
        trabajo.current = nuevoTrabajoIA();
        const r = await window.api.generarResumenDocumento({
          trabajoId: trabajo.current.id,
          idArchivo,
          ...(indicaciones.trim() ? { indicaciones: indicaciones.trim() } : {}),
        });
        if (miCorrida !== corrida.current) {
          if (r.ok) void Promise.resolve(window.api.descartarMaterialIA({ trabajoId: r.trabajoId })).catch(() => undefined);
          return;
        }
        if (!r.ok) {
          descartarPropuestas();
          return setPaso('configurar'); // canceló
        }
        trabajosGenerados.current.push(r.trabajoId);
        partes.push({ nombreArchivo: r.nombreArchivo, html: r.html });
      }
      // Cada resumen ya trae su título (h1): juntos quedan uno debajo del otro.
      setHtml(partes.map((p) => p.html).join('<hr>'));
      setNombre(partes.length === 1 ? partes[0].nombreArchivo : `Resumen (${partes.length} materiales)`);
      setPaso('corregir');
    } catch (e) {
      if (miCorrida !== corrida.current) return;
      descartarPropuestas();
      setError(mensajeError(e, 'No se pudo generar el resumen.'));
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
      const r = await window.api.guardarResumenDocumento({
        trabajosIds: trabajosGenerados.current,
        nombre: nombre.trim(),
        html: htmlCorregido,
      });
      trabajosGenerados.current = [];
      onGuardado?.(r.archivo);
      setPaso('guardado');
    } catch (e) {
      setError(mensajeError(e, 'No se pudo guardar el documento.'));
    } finally {
      setGuardando(false);
    }
  }

  function cerrar() {
    corrida.current++;
    void trabajo.current?.cancelar();
    if (paso !== 'guardado') descartarPropuestas();
    onCerrar();
  }

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resumen-ia-titulo"
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          ...(paso === 'corregir' ? { width: 'min(960px, 95vw)' } : {}),
        }}
      >
        <h2 id="resumen-ia-titulo">Resumen con IA</h2>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {paso === 'configurar' && (
          <>
            <label>Material (podés elegir varios archivos)</label>
            <SelectorMateriales archivos={archivos} seleccionados={idsArchivos} onCambiar={setIdsArchivos} cargando={cargandoArchivos} />
            <label htmlFor="resumen-indicaciones">Indicaciones para la IA (opcional)</label>
            <textarea
              id="resumen-indicaciones"
              rows={3}
              maxLength={1800}
              placeholder='Ej. "más corto", "enfocate en la unidad 2", "con ejemplos"'
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
            />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
              <Button onClick={() => void generar()} disabled={idsArchivos.length === 0}>Generar resumen</Button>
            </div>
          </>
        )}

        {paso === 'generando' && (
          <ModalGenerando
            mensaje="Generando el resumen"
            detalle={
              idsArchivos.length > 1
                ? `Archivo ${Math.min(avance + 1, idsArchivos.length)} de ${idsArchivos.length} · puede tardar un poco`
                : 'Puede tardar un poco según el tamaño del material.'
            }
            onCancelar={cancelarGeneracion}
          />
        )}

        {paso === 'corregir' && (
          <>
            <p className={styles.description}>
              Revisá y editá el resumen. Al guardar se crea un Word en la carpeta "Resúmenes" de Material.
            </p>
            <label htmlFor="resumen-nombre">Nombre del documento</label>
            <input id="resumen-nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} />
            <EditorGuia html={html} guardando={guardando} onGuardar={guardar} />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={cerrar} disabled={guardando}>Descartar</Button>
            </div>
          </>
        )}

        {paso === 'guardado' && (
          <>
            <p className={styles.notice} role="status">
              Listo: el resumen se guardó en la carpeta "Resúmenes" de Material como documento Word.
            </p>
            <div className={styles.modalActions}>
              <Button onClick={onCerrar}>Cerrar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
