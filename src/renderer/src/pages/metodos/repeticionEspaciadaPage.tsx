import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, FileText, Layers3, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import type { FlashcardPendiente, RepeticionMaterial } from '../../types/flashcards';
import type { Nodo } from '../../types/nodo';
import styles from '../../styles/metodos.module.css';

type Pestaña = 'flashcards' | 'material';
type CarpetaRuta = { id: number; nombre: string };

function fechaDeVencimiento(fecha: string | Date): string {
  const vencimiento = new Date(fecha);
  const hoy = new Date();
  vencimiento.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);
  return vencimiento.getTime() === hoy.getTime()
    ? 'Vence hoy'
    : `Vencía el ${vencimiento.toLocaleDateString()}`;
}

export function RepeticionEspaciadaPage() {
  const navigate = useNavigate();
  const [pestaña, setPestaña] = useState<Pestaña>('flashcards');
  const [repasos, setRepasos] = useState<FlashcardPendiente[]>([]);
  const [programados, setProgramados] = useState<RepeticionMaterial[]>([]);
  const [carpetas, setCarpetas] = useState<Nodo[]>([]);
  const [archivos, setArchivos] = useState<Nodo[]>([]);
  const [ruta, setRuta] = useState<CarpetaRuta[]>([{ id: 1, nombre: 'Material de estudio' }]);
  const [intervalos, setIntervalos] = useState<Record<number, 1 | 3 | 7 | 14>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState('');
  const usuarioId = Number(localStorage.getItem('usuarioId'));
  const carpetaActual = ruta[ruta.length - 1];

  const cargarDatos = useCallback(async () => {
    try {
      setError('');
      const [listaRepasos, listaProgramados] = await Promise.all([
        window.api.listarFlashcardsPendientes(usuarioId),
        window.api.listarRepeticionesMaterial(usuarioId),
      ]);
      setRepasos(listaRepasos);
      setProgramados(listaProgramados);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los repasos.');
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  const cargarCarpetas = useCallback(async () => {
    try {
      const contenido = await window.api.listarContenido({
        idPadre: carpetaActual.id,
        ordenarPor: 'nombre',
        direccion: 'ASC',
      });
      setCarpetas(contenido.filter((nodo) => nodo.tipo === 'carpeta'));
      setArchivos(contenido.filter((nodo) => nodo.tipo === 'archivo'));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar el material.');
    }
  }, [carpetaActual.id]);

  useEffect(() => {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      setError('No se encontró una sesión válida. Volvé a iniciar sesión.');
      setCargando(false);
      return;
    }
    void cargarDatos();
  }, [cargarDatos, usuarioId]);

  useEffect(() => {
    if (pestaña === 'material') void cargarCarpetas();
  }, [cargarCarpetas, pestaña]);

  async function habilitarRepeticion(nodoId: number) {
    try {
      setGuardando(nodoId);
      setError('');
      const guardado = await window.api.guardarRepeticionMaterial({
        usuarioId,
        nodoId,
        intervaloDias: intervalos[nodoId] ?? 7,
      });
      setProgramados((actuales) => [
        guardado,
        ...actuales.filter((item) => item.nodoId !== nodoId),
      ]);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo habilitar la repetición.');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <PlantillaLayout titulo="Repetición Espaciada" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <Link className={styles.backLink} to="/metodos"><ArrowLeft size={17} /> Métodos de estudio</Link>
        <div className={styles.tabs} role="tablist" aria-label="Contenido para repasar">
          <button type="button" role="tab" aria-selected={pestaña === 'flashcards'} className={pestaña === 'flashcards' ? styles.activeTab : ''} onClick={() => setPestaña('flashcards')}>Flashcards</button>
          <button type="button" role="tab" aria-selected={pestaña === 'material'} className={pestaña === 'material' ? styles.activeTab : ''} onClick={() => setPestaña('material')}>Material</button>
        </div>

        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={() => {
          if (pestaña === 'material') void cargarCarpetas();
          else void cargarDatos();
        }} />}

        {pestaña === 'flashcards' ? (
          <section role="tabpanel" className={styles.reviewPanel}>
            <div className={styles.panelHeading}>
              <div><h2>Repasar hoy</h2><p>Tarjetas que ya están listas para volver a estudiar.</p></div>
              <span className={styles.countBadge}>{repasos.length}</span>
            </div>
            {cargando ? <p className={styles.emptyText} role="status">Cargando repasos…</p> : repasos.length ? (
              <div className={styles.reviewList}>
                {repasos.map((tarjeta) => (
                  <article className={styles.reviewItem} key={tarjeta.idFlashcard}>
                    <span className={styles.reviewIcon}><BookOpen size={19} /></span>
                    <div className={styles.reviewText}>
                      <strong>{tarjeta.nombreDeck}</strong>
                      <span>{tarjeta.pregunta}</span>
                      <small>{fechaDeVencimiento(tarjeta.proximaRevision)}</small>
                    </div>
                    <Button variant="secondary" onClick={() => navigate(`/flashcards/${tarjeta.deckId}/estudiar`)}>Estudiar</Button>
                  </article>
                ))}
              </div>
            ) : <p className={styles.emptyText}>No tenés flashcards pendientes. ¡Buen trabajo!</p>}
          </section>
        ) : (
          <section role="tabpanel" className={styles.reviewPanel}>
            <div className={styles.panelHeading}>
              <div><h2>Elegí una unidad</h2><p>Habilitá repasos para tus carpetas de material.</p></div>
            </div>
            <nav className={styles.breadcrumb} aria-label="Ubicación del material">
              {ruta.map((carpeta, indice) => (
                <button type="button" key={carpeta.id} onClick={() => setRuta(ruta.slice(0, indice + 1))}>
                  {indice > 0 && <ChevronRight size={15} />}{carpeta.nombre}
                </button>
              ))}
            </nav>
            {carpetas.length || archivos.length ? (
              <div className={styles.materialList}>
                {carpetas.map((carpeta) => {
                  const actual = programados.find((item) => item.nodoId === carpeta.id);
                  return (
                    <article className={styles.materialItem} key={carpeta.id}>
                      <button
                        type="button"
                        className={styles.folderName}
                        onClick={() => setRuta((actualRuta) => [...actualRuta, { id: carpeta.id, nombre: carpeta.nombre }])}
                      >
                        <Layers3 size={19} /><span>{carpeta.nombre}</span><ChevronRight size={17} />
                      </button>
                      <div className={styles.scheduleControls}>
                        <label htmlFor={`interval-${carpeta.id}`}>Repasar cada</label>
                        <select
                          id={`interval-${carpeta.id}`}
                          value={intervalos[carpeta.id] ?? actual?.intervaloDias ?? 7}
                          onChange={(evento) => setIntervalos((valores) => ({
                            ...valores,
                            [carpeta.id]: Number(evento.target.value) as 1 | 3 | 7 | 14,
                          }))}
                        >
                          <option value={1}>1 día</option>
                          <option value={3}>3 días</option>
                          <option value={7}>7 días</option>
                          <option value={14}>14 días</option>
                        </select>
                        <Button variant="secondary" disabled={guardando === carpeta.id} onClick={() => void habilitarRepeticion(carpeta.id)}>
                          {guardando === carpeta.id ? 'Guardando…' : actual ? 'Actualizar' : 'Habilitar repetición'}
                        </Button>
                      </div>
                      {actual && <small className={styles.nextReview}>Próximo repaso: {new Date(actual.proximaRevision).toLocaleDateString()}</small>}
                    </article>
                  );
                })}
                {archivos.map((archivo) => (
                  <article className={`${styles.materialItem} ${styles.fileItem}`} key={`archivo-${archivo.id}`}>
                    <span className={styles.folderName}>
                      <FileText size={19} /><span>{archivo.nombre}</span>
                    </span>
                    <small className={styles.nextReview}>Se repasa junto con la carpeta</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>{cargando ? 'Cargando material…' : 'No hay material en esta ubicación.'}</p>
            )}
          </section>
        )}
      </section>
    </PlantillaLayout>
  );
}