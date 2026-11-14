import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { ResultadoCuestionario } from '../../components/ia/resultadoCuestionario';
import { usarAvisos } from '../../hooks/usarAvisos';
import {
  HUECO,
  type CuestionarioParaResolver,
  type MaterialIA,
  type PreguntaParaResolver,
  type RespuestaUsuario,
  type ResultadoCuestionario as Resultado,
} from '../../types/ia';
import { mensajeError } from './utilidadesMetodosIA';
import styles from '../../styles/metodos.module.css';
import '../../styles/metodosIA.css';

const TIPO_PREGUNTA = {
  opcion_multiple: 'Opción múltiple',
  completar_seleccion: 'Completá eligiendo',
  completar_escrito: 'Completá escribiendo',
} as const;

const respondida = (r: RespuestaUsuario) => r !== null && r !== '';

// Enunciado con el hueco "___" a la vista: con un cuadro de texto o con la opción elegida.
function Enunciado({ pregunta, respuesta, onEscribir }: {
  pregunta: PreguntaParaResolver;
  respuesta: RespuestaUsuario;
  onEscribir: (texto: string) => void;
}) {
  if (pregunta.tipo === 'opcion_multiple' || !pregunta.enunciado.includes(HUECO)) {
    return <p className="resolver__enunciado">{pregunta.enunciado}</p>;
  }
  const [antes, ...resto] = pregunta.enunciado.split(HUECO);
  const despues = resto.join(HUECO);
  return (
    <p className="resolver__enunciado">
      {antes}
      {pregunta.tipo === 'completar_escrito' ? (
        <input
          className="resolver__hueco-escrito"
          value={typeof respuesta === 'string' ? respuesta : ''}
          onChange={(e) => onEscribir(e.target.value)}
          maxLength={200}
          placeholder="Escribí la respuesta"
          aria-label="Respuesta"
          autoFocus
        />
      ) : (
        <span className="resolver__hueco">
          {typeof respuesta === 'number' ? pregunta.opciones[respuesta] : ' '.repeat(10)}
        </span>
      )}
      {despues}
    </p>
  );
}

// Resolver un cuestionario: una pregunta por vez y la corrección recién al final (la hace el main).
export function ResolverCuestionarioPage() {
  const idMaterialIA = Number(useParams().id);
  const { confirmar } = usarAvisos();
  const [material, setMaterial] = useState<MaterialIA | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaUsuario[]>([]);
  const [actual, setActual] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.obtenerMaterialIA({ idMaterialIA })
      .then((m) => {
        setMaterial(m);
        setRespuestas((m.contenido as CuestionarioParaResolver).preguntas.map(() => null));
      })
      .catch((e) => setError(mensajeError(e, 'No se pudo abrir el cuestionario.')));
  }, [idMaterialIA]);

  const cuestionario = material?.contenido as CuestionarioParaResolver | undefined;
  const pregunta = cuestionario?.preguntas[actual];
  const responder = (valor: RespuestaUsuario) =>
    setRespuestas((r) => r.map((x, i) => (i === actual ? valor : x)));
  const sinResponder = respuestas.filter((r) => !respondida(r)).length;
  const esUltima = cuestionario ? actual === cuestionario.preguntas.length - 1 : false;

  async function corregir() {
    if (sinResponder > 0) {
      const seguir = await confirmar(
        `Te ${sinResponder === 1 ? 'quedó 1 pregunta' : `quedaron ${sinResponder} preguntas`} sin responder. Cuentan como mal.`,
        { titulo: '¿Terminar y corregir?', textoConfirmar: 'Corregir igual' },
      );
      if (!seguir) return;
    }
    setEnviando(true);
    try {
      const limpias = respuestas.map((r) => (typeof r === 'string' ? r.trim() || null : r));
      setResultado(await window.api.responderCuestionario({ idMaterialIA, respuestas: limpias }));
    } catch (e) {
      setError(mensajeError(e, 'No se pudo corregir el cuestionario.'));
    } finally {
      setEnviando(false);
    }
  }

  function volverAIntentar() {
    setResultado(null);
    setActual(0);
    setRespuestas((r) => r.map(() => null));
  }

  return (
    <PlantillaLayout titulo="Cuestionarios" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/cuestionarios/${idMaterialIA}`}><ArrowLeft size={17} /> Volver al cuestionario</Link>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}
        {!material && !error && <p className={styles.emptyText} role="status">Cargando…</p>}

        {cuestionario && !resultado && pregunta && (
          <section className={`${styles.reviewPanel} resolver`}>
            <header className="resolver__cabecera">
              <h2>{cuestionario.titulo}</h2>
              <span>Pregunta {actual + 1} de {cuestionario.preguntas.length}</span>
            </header>
            <progress className="resolver__progreso" value={actual + 1} max={cuestionario.preguntas.length} />

            <div className="resolver__pregunta">
              <span className="resolver__tipo">{TIPO_PREGUNTA[pregunta.tipo]}</span>
              <Enunciado pregunta={pregunta} respuesta={respuestas[actual]} onEscribir={responder} />

              {pregunta.tipo !== 'completar_escrito' && (
                <div className="resolver__opciones" role="radiogroup" aria-label="Opciones">
                  {pregunta.opciones.map((opcion, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={respuestas[actual] === i}
                      className={respuestas[actual] === i ? 'resolver__opcion resolver__opcion--elegida' : 'resolver__opcion'}
                      onClick={() => responder(i)}
                    >
                      <span className="resolver__letra">{String.fromCharCode(65 + i)}</span>
                      {opcion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <footer className="resolver__pie">
              <Button variant="secondary" disabled={actual === 0} onClick={() => setActual((a) => a - 1)}>Anterior</Button>
              <span className="resolver__pendientes">
                {sinResponder ? `${sinResponder} sin responder` : 'Todas respondidas'}
              </span>
              {esUltima ? (
                <Button disabled={enviando} onClick={() => void corregir()}>{enviando ? 'Corrigiendo…' : 'Terminar y corregir'}</Button>
              ) : (
                <Button onClick={() => setActual((a) => a + 1)}>Siguiente</Button>
              )}
            </footer>
          </section>
        )}

        {resultado && (
          <section className={styles.reviewPanel}>
            <ResultadoCuestionario resultado={resultado} />
            <div className="resolver__pie">
              <Button variant="secondary" onClick={volverAIntentar}>Volver a intentar</Button>
            </div>
          </section>
        )}
      </section>
    </PlantillaLayout>
  );
}
