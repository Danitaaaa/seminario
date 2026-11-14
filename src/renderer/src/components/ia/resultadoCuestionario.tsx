import { CheckCircle2, Target, XCircle } from 'lucide-react';
import { HUECO, type PreguntaCorregida, type ResultadoCuestionario as Resultado, type TemaAReforzar } from '../../types/ia';
import { porcentaje } from '../../pages/metodos/utilidadesMetodosIA';

// Lo que respondió el usuario, en texto.
function textoRespuesta(p: PreguntaCorregida): string {
  if (p.respuestaUsuario === null || p.respuestaUsuario === '') return 'Sin responder';
  if (typeof p.respuestaUsuario === 'number') return p.opciones[p.respuestaUsuario] ?? 'Sin responder';
  return p.respuestaUsuario;
}

// En las de completar se muestra la oración con el hueco ya completado.
function enunciadoCompletado(p: PreguntaCorregida): string {
  return p.tipo === 'opcion_multiple' ? p.enunciado : p.enunciado.replace(HUECO, `[${p.respuestaCorrecta}]`);
}

export function TemasAReforzar({ temas }: { temas: TemaAReforzar[] }) {
  if (!temas.length) {
    return <p className="cuestionario-resultado__sin-temas">¡Respondiste todo bien! No hay temas para reforzar.</p>;
  }
  return (
    <ul className="cuestionario-resultado__temas">
      {temas.map((t) => (
        <li key={t.tema}>
          <Target size={16} aria-hidden="true" />
          <strong>{t.tema}</strong>
          <span>{t.errores} de {t.total} {t.total === 1 ? 'pregunta' : 'preguntas'} mal</span>
        </li>
      ))}
    </ul>
  );
}

export function ResultadoCuestionario({ resultado }: { resultado: Resultado }) {
  const nota = porcentaje(resultado.correctas, resultado.total);
  return (
    <div className="cuestionario-resultado">
      <div className="cuestionario-resultado__nota">
        <span className="cuestionario-resultado__porcentaje">{nota}%</span>
        <span>{resultado.correctas} de {resultado.total} respuestas correctas</span>
      </div>

      <section>
        <h3>Temas a reforzar</h3>
        <TemasAReforzar temas={resultado.temasAReforzar} />
      </section>

      <section>
        <h3>Corrección</h3>
        <ol className="cuestionario-resultado__preguntas">
          {resultado.preguntas.map((p, i) => (
            <li key={i} className={p.correcta ? 'es-correcta' : 'es-incorrecta'}>
              <div className="cuestionario-resultado__titulo">
                {p.correcta
                  ? <CheckCircle2 size={18} aria-label="Correcta" />
                  : <XCircle size={18} aria-label="Incorrecta" />}
                <span>{enunciadoCompletado(p)}</span>
              </div>
              {!p.correcta && (
                <p>Tu respuesta: <strong>{textoRespuesta(p)}</strong> · Correcta: <strong>{p.respuestaCorrecta}</strong></p>
              )}
              <p className="cuestionario-resultado__explicacion">{p.explicacion}</p>
              <small>Tema: {p.tema}</small>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
