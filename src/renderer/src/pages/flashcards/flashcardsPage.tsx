import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronRight, RotateCcw, Search, SkipForward } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { TextoConFormulas } from '../../components/comunes/textoConFormulas';
import { LARGO_PREGUNTA, LARGO_RESPUESTA, pegarConFormulas, tieneFormulas } from '../../utils/formulas';
import { TarjetaFlashcard } from '../../components/flashcards/tarjetaFlashcard';
import type { Deck, Flashcard } from '../../types/flashcards';
import { ESTILOS_TARJETA, usarEstiloFlashcards, type EstiloTarjeta } from '../../hooks/usarEstiloFlashcards';
import styles from '../../styles/flashcards.module.css';

function usuarioIdActual(): number {
  const usuarioId = Number(localStorage.getItem('usuarioId'));
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error('No se encontró una sesión válida. Volvé a iniciar sesión.');
  }
  return usuarioId;
}

function ultimaRevision(fecha?: string | Date | null): string {
  if (!fecha) return 'Sin revisiones todavía';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Revisada anteriormente';
  return valor.toDateString() === new Date().toDateString() ? 'Hoy' : valor.toLocaleDateString();
}

export function FlashcardsPage() {
  const [mazos, setMazos] = useState<Deck[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [nombre, setNombre] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');

  const cargarMazos = useCallback(async () => {
    try {
      setError('');
      setMazos(await window.api.listarDecks(usuarioIdActual()));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los mazos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarMazos(); }, [cargarMazos]);

  async function crearMazo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombreMazo = nombre.trim();
    if (!nombreMazo) {
      setErrorFormulario('El nombre del mazo es obligatorio.');
      return;
    }
    if (nombreMazo.length > 50) {
      setErrorFormulario('El nombre del mazo no puede superar los 50 caracteres.');
      return;
    }
    try {
      setGuardando(true);
      setError('');
      setErrorFormulario('');
      await window.api.crearDeck({ usuarioId: usuarioIdActual(), nombre: nombreMazo });
      setNombre('');
      setModalAbierto(false);
      await cargarMazos();
    } catch (fallo) {
      setErrorFormulario(fallo instanceof Error ? fallo.message : 'No se pudo crear el mazo.');
    } finally {
      setGuardando(false);
    }
  }

  const filtrados = mazos.filter((mazo) => mazo.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));

  return (
    <PlantillaLayout titulo="Flashcards" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <div className={styles.page}>
        <Link className={styles.backLink} to="/metodos"><ArrowLeft size={17} /> Métodos de estudio</Link>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>MÉTODOS DE ESTUDIO</p>
            <h2 className={styles.heading}>Tus mazos</h2>
            <p className={styles.description}>Organizá tus tarjetas y repasá a tu ritmo.</p>
          </div>
          <Button onClick={() => {
            setErrorFormulario('');
            setModalAbierto(true);
          }}>＋ Crear nuevo mazo</Button>
        </header>
        <label className={styles.search}>
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar mazos" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} aria-label="Buscar mazos" />
        </label>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={cargarMazos} />}
        {cargando ? <p className={styles.notice} role="status">Cargando tus mazos…</p> : filtrados.length ? (
          <div className={styles.deckGrid}>
            {filtrados.map((mazo) => (
              <Link className={styles.deckCard} to={`/flashcards/${mazo.idDeck}`} key={mazo.idDeck}>
                <span className={styles.deckIcon}><BookOpen size={22} /></span>
                <span className={styles.deckCardText}>
                  <strong>{mazo.nombre}</strong>
                  <span>{mazo.cantidadFlashcards ?? 0} {(mazo.cantidadFlashcards ?? 0) === 1 ? 'tarjeta' : 'tarjetas'}</span>
                  <small>Última revisión: {ultimaRevision(mazo.ultimaRevision)}</small>
                </span>
                <ChevronRight className={styles.chevron} size={20} />
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><BookOpen size={25} /></span>
            <h3>{busqueda ? 'No encontramos mazos' : 'Todavía no tenés mazos'}</h3>
            <p>{busqueda ? 'Probá con otro nombre.' : 'Creá tu primer mazo para empezar a estudiar.'}</p>
            {!busqueda && <Button onClick={() => setModalAbierto(true)}>Crear mi primer mazo</Button>}
          </div>
        )}
      </div>
      {modalAbierto && (
        <div className={styles.modalBackdrop} onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) {
            setErrorFormulario('');
            setModalAbierto(false);
          }
        }}>
          <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-deck-title" onSubmit={crearMazo}>
            <h2 id="new-deck-title">Nuevo mazo</h2>
            <label htmlFor="deck-name">Nombre del mazo</label>
            <input autoFocus id="deck-name" placeholder="Ej. Base de Datos" value={nombre} onChange={(evento) => {
              setNombre(evento.target.value);
              setErrorFormulario('');
            }} aria-invalid={Boolean(errorFormulario)} aria-describedby={errorFormulario ? 'deck-name-error' : undefined} />
            {errorFormulario && <p id="deck-name-error" className={styles.formError} role="alert">{errorFormulario}</p>}
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => {
                setErrorFormulario('');
                setModalAbierto(false);
              }}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear'}</Button>
            </div>
          </form>
        </div>
      )}
    </PlantillaLayout>
  );
}

export function DeckFlashcardsPage() {
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);
  const navigate = useNavigate();
  const [mazo, setMazo] = useState<Deck | null>(null);
  const [tarjetas, setTarjetas] = useState<Flashcard[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  // Flashcard que se está editando en el formulario de arriba; null = se está creando una nueva.
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const cargarMazo = useCallback(async () => {
    try {
      setError('');
      const usuarioId = usuarioIdActual();
      const [mazos, listado] = await Promise.all([
        window.api.listarDecks(usuarioId),
        window.api.listarFlashcards({ usuarioId, deckId }),
      ]);
      const encontrado = mazos.find((item) => item.idDeck === deckId);
      if (!encontrado) throw new Error('No se encontró el mazo solicitado.');
      setMazo(encontrado);
      setTarjetas(listado);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar el mazo.');
    } finally {
      setCargando(false);
    }
  }, [deckId]);

  useEffect(() => { void cargarMazo(); }, [cargarMazo]);

  // Guarda el formulario: crea una flashcard nueva o, si se está editando una, le guarda los cambios.
  async function guardarFlashcard(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const preguntaLimpia = pregunta.trim();
    const respuestaLimpia = respuesta.trim();
    if (!preguntaLimpia) {
      setErrorFormulario('La pregunta es obligatoria.');
      return;
    }
    if (preguntaLimpia.length > LARGO_PREGUNTA) {
      setErrorFormulario(`La pregunta no puede superar los ${LARGO_PREGUNTA} caracteres.`);
      return;
    }
    if (!respuestaLimpia) {
      setErrorFormulario('La respuesta es obligatoria.');
      return;
    }
    if (respuestaLimpia.length > LARGO_RESPUESTA) {
      setErrorFormulario(`La respuesta no puede superar los ${LARGO_RESPUESTA} caracteres.`);
      return;
    }
    try {
      setGuardando(true);
      setError('');
      setErrorFormulario('');
      if (editandoId !== null) {
        const editada = await window.api.modificarFlashcard({
          usuarioId: usuarioIdActual(),
          idFlashcard: editandoId,
          pregunta: preguntaLimpia,
          respuesta: respuestaLimpia,
        });
        setTarjetas((lista) => lista.map((t) => (t.idFlashcard === editandoId ? editada : t)));
        limpiarFormulario();
      } else {
        await window.api.crearFlashcard({ usuarioId: usuarioIdActual(), deckId, pregunta: preguntaLimpia, respuesta: respuestaLimpia });
        limpiarFormulario();
        await cargarMazo();
      }
    } catch (fallo) {
      setErrorFormulario(fallo instanceof Error ? fallo.message : 'No se pudo guardar la flashcard.');
    } finally {
      setGuardando(false);
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setPregunta('');
    setRespuesta('');
    setErrorFormulario('');
  }

  // El lápiz de una tarjeta la carga en el formulario de arriba para editarla ahí.
  function editarFlashcard(tarjeta: Flashcard) {
    setEditandoId(tarjeta.idFlashcard);
    setPregunta(tarjeta.pregunta);
    setRespuesta(tarjeta.respuesta);
    setErrorFormulario('');
    const campo = document.getElementById('question');
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    campo?.focus({ preventScroll: true });
  }

  function nuevaFlashcard() {
    limpiarFormulario();
    document.getElementById('question')?.focus();
  }

  return (
    <PlantillaLayout titulo={mazo?.nombre ?? 'Mazo'} idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <div className={styles.page}>
        <Link className={styles.backLink} to="/flashcards"><ArrowLeft size={17} /> Volver a mis mazos</Link>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={cargarMazo} />}
        {cargando ? <p className={styles.notice} role="status">Cargando el mazo…</p> : mazo && (
          <>
            <header className={styles.toolbar}>
              <div><p className={styles.eyebrow}>MAZO DE ESTUDIO</p><h2 className={styles.heading}>{mazo.nombre}</h2><p className={styles.description}>{tarjetas.length} {tarjetas.length === 1 ? 'flashcard' : 'flashcards'}</p></div>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => navigate(`/flashcards/${deckId}/estudiar`)} disabled={!tarjetas.length}><RotateCcw size={17} /> Reproducir mazo</Button>
                <Button onClick={nuevaFlashcard}>＋ Crear Flashcard</Button>
              </div>
            </header>
            <form className={`${styles.createForm} ${editandoId !== null ? styles.createFormEditing : ''}`} onSubmit={guardarFlashcard}>
              <h3>{editandoId !== null ? 'Editar flashcard' : 'Nueva flashcard'}</h3>
              <label htmlFor="question">Pregunta</label>
              <input id="question" placeholder="Escribí una pregunta breve" value={pregunta} onChange={(evento) => {
                setPregunta(evento.target.value);
                setErrorFormulario('');
              }} onPaste={(evento) => pegarConFormulas(evento, pregunta, (nuevo) => { setPregunta(nuevo); setErrorFormulario(''); })} aria-invalid={Boolean(errorFormulario)} aria-describedby={errorFormulario ? 'flashcard-error' : undefined} />
              <label htmlFor="answer">Respuesta</label>
              <textarea id="answer" rows={5} placeholder="Escribí la respuesta" value={respuesta} onChange={(evento) => {
                setRespuesta(evento.target.value);
                setErrorFormulario('');
              }} onPaste={(evento) => pegarConFormulas(evento, respuesta, (nuevo) => { setRespuesta(nuevo); setErrorFormulario(''); })} aria-invalid={Boolean(errorFormulario)} aria-describedby={errorFormulario ? 'flashcard-error' : 'flashcard-formulas'} />
              <p id="flashcard-formulas" className={styles.formulaHint}>
                Fórmulas: escribilas entre $ y $ (por ejemplo $x^2 + 1$) o pegalas desde ChatGPT, Wikipedia o Word.
              </p>
              {(tieneFormulas(pregunta) || tieneFormulas(respuesta)) && (
                <div className={styles.formulaPreview} aria-live="polite">
                  <small>Vista previa</small>
                  {pregunta.trim() && <strong><TextoConFormulas texto={pregunta} /></strong>}
                  {respuesta.trim() && <p><TextoConFormulas texto={respuesta} /></p>}
                </div>
              )}
              {errorFormulario && <p id="flashcard-error" className={styles.formError} role="alert">{errorFormulario}</p>}
              <div className={styles.formActions}>
                <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar Flashcard'}</Button>
                {editandoId !== null && (
                  <Button variant="secondary" onClick={limpiarFormulario} disabled={guardando}>Cancelar edición</Button>
                )}
              </div>
            </form>
            {tarjetas.length ? (
              <div className={styles.cardList}>
                {tarjetas.map((tarjeta) => <TarjetaFlashcard key={tarjeta.idFlashcard} tarjeta={tarjeta} editando={tarjeta.idFlashcard === editandoId} onEditar={() => editarFlashcard(tarjeta)} />)}
              </div>
            ) : <p className={styles.notice}>Aún no hay tarjetas. Creá la primera con el formulario.</p>}
          </>
        )}
      </div>
    </PlantillaLayout>
  );
}

// Clase de CSS de cada estilo de tarjeta (los dibujos usan los colores de la paleta).
const CLASE_ESTILO: Record<EstiloTarjeta, string> = {
  simple: '',
  ondas: styles.styleWaves,
  esquinas: styles.styleCorners,
};

export function EstudiarFlashcardsPage() {
  const { estilo, cambiarEstilo } = usarEstiloFlashcards();
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);
  const navigate = useNavigate();
  const [mazo, setMazo] = useState<Deck | null>(null);
  const [tarjetas, setTarjetas] = useState<Flashcard[]>([]);
  const [indice, setIndice] = useState(0);
  const [volteada, setVolteada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const usuarioId = usuarioIdActual();
        const [mazos, listado] = await Promise.all([
          window.api.listarDecks(usuarioId),
          window.api.listarFlashcards({ usuarioId, deckId }),
        ]);
        setMazo(mazos.find((item) => item.idDeck === deckId) ?? null);
        setTarjetas(listado);
      } catch (fallo) {
        setError(fallo instanceof Error ? fallo.message : 'No se pudo iniciar la sesión de estudio.');
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, [deckId]);

  async function evaluar(dificultad: 'dificil' | 'intermedio' | 'facil') {
    const actual = tarjetas[indice];
    if (!actual) return;
    try {
      setGuardando(true);
      setError('');
      await window.api.registrarRevision({ usuarioId: usuarioIdActual(), flashcardId: actual.idFlashcard, dificultad });
      setVolteada(false);
      setIndice((valor) => valor + 1);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo registrar el repaso.');
    } finally {
      setGuardando(false);
    }
  }

  // Saltar no registra el repaso: la tarjeta pasa al final y vuelve a aparecer después de las demás.
  function saltar() {
    setVolteada(false);
    setTarjetas((lista) => [...lista.slice(0, indice), ...lista.slice(indice + 1), lista[indice]]);
  }

  const actual = tarjetas[indice];
  const quedanOtras = indice < tarjetas.length - 1;
  if (cargando) return <main className={styles.studyShell}><p role="status">Preparando tus tarjetas…</p></main>;
  if (error && !actual) return <main className={styles.studyShell}><CartelError mensaje={error} /><Button onClick={() => navigate(`/flashcards/${deckId}`)}>Volver al mazo</Button></main>;
  if (!actual) return (
    <main className={styles.studyShell}>
      <span className={styles.finishedIcon}><Check size={28} /></span>
      <p className={styles.eyebrow}>SESIÓN COMPLETADA</p><h1>¡Buen trabajo!</h1>
      <p>Terminaste las {tarjetas.length} tarjetas de {mazo?.nombre ?? 'este mazo'}.</p>
      <div className={styles.actions}><Button variant="secondary" onClick={() => navigate(`/flashcards/${deckId}`)}>Volver al mazo</Button><Button onClick={() => navigate('/repeticion-espaciada')}>Ver repasos pendientes</Button></div>
    </main>
  );

  return (
    <main className={styles.studyShell}>
      <header className={styles.studyHeader}>
        <button type="button" className={styles.iconButton} onClick={() => navigate(`/flashcards/${deckId}`)} aria-label="Salir del estudio"><ArrowLeft /></button>
        <span>{mazo?.nombre ?? 'Estudiar'} · {indice + 1} de {tarjetas.length}</span>
        <span className={styles.progressTrack}><span style={{ width: `${((indice + 1) / tarjetas.length) * 100}%` }} /></span>
      </header>
      <div className={styles.styleSelector} role="radiogroup" aria-label="Estilo de la tarjeta">
        <span>Estilo</span>
        {ESTILOS_TARJETA.map(({ valor, etiqueta }) => (
          <button key={valor} type="button" role="radio" aria-checked={estilo === valor} className={`${styles.styleOption} ${estilo === valor ? styles.styleOptionActive : ''}`} onClick={() => cambiarEstilo(valor)}>
            <span className={`${styles.styleSwatch} ${CLASE_ESTILO[valor]}`} aria-hidden="true" />
            {etiqueta}
          </button>
        ))}
      </div>
      {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}
      <button type="button" className={`${styles.studyCard} ${CLASE_ESTILO[estilo]} ${volteada ? styles.studyCardFlipped : ''}`} onClick={() => setVolteada((valor) => !valor)} aria-label={volteada ? 'Mostrar la pregunta' : 'Voltear para ver la respuesta'}>
        <span className={styles.cardSide}><small>{volteada ? 'RESPUESTA' : 'PREGUNTA'}</small><span><TextoConFormulas texto={volteada ? actual.respuesta : actual.pregunta} /></span>{!volteada && <small className={styles.flipHint}>Voltear para visualizar la respuesta</small>}</span>
      </button>
      {volteada && <section className={styles.rating}><p>¿Cómo te resultó?</p><div className={styles.ratingButtons}>
        <button type="button" className={styles.difficult} disabled={guardando} onClick={() => void evaluar('dificil')}>Difícil <small>1 día</small></button>
        <button type="button" className={styles.medium} disabled={guardando} onClick={() => void evaluar('intermedio')}>Intermedio <small>3 días</small></button>
        <button type="button" className={styles.easy} disabled={guardando} onClick={() => void evaluar('facil')}>Fácil <small>6 días</small></button>
      </div></section>}
      {quedanOtras && (
        <button type="button" className={styles.skipButton} disabled={guardando} onClick={saltar}>
          <SkipForward size={16} aria-hidden="true" /> Saltar por ahora
        </button>
      )}
    </main>
  );
}