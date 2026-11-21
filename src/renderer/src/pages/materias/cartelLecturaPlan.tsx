// Cartel al costado mientras la IA lee un plan de estudios y el usuario está en otra pantalla
// (como el de las flashcards). Al volver a la pantalla del plan, el cartel se va y el progreso se ve ahí.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { IndicadorIA } from '../../components/materialIA/indicadorIA';
import { usarSegundoPlano } from '../../components/materialIA/segundoPlano';
import { hablar } from '../../voz/narrador';
import { cancelarLecturaPlan, usarLecturaPlan, usarPantallaPlan } from './lecturaPlanIA';

export function CartelLecturaPlan() {
  const { pila } = usarSegundoPlano();
  const navigate = useNavigate();
  const lectura = usarLecturaPlan();
  const pantalla = usarPantallaPlan();
  const [achicado, setAchicado] = useState(false);

  const enOtraPantalla = lectura !== null && pantalla !== lectura.idFormacion;
  const trabajando = lectura !== null && lectura.fase !== 'lista';
  const listo = lectura?.fase === 'lista';

  useEffect(() => {
    if (enOtraPantalla && listo) hablar(lectura.preguntas ? 'La IA necesita tu ayuda con el plan.' : 'Listo, ya se leyó el plan.');
  }, [enOtraPantalla && listo]);

  if (!pila || !lectura || !enOtraPantalla) return null;

  const volver = () => navigate(`/materias/plan/${lectura.idFormacion}`);

  if (trabajando && achicado) {
    return createPortal(
      <button type="button" className="tarjeta-ia-pastilla" onClick={() => setAchicado(false)} title="Mostrar el cartel" aria-label="Leyendo el plan con IA. Mostrar el cartel">
        <span className="tarjeta-ia-pastilla__chispa" aria-hidden="true"><Sparkles size={16} /></span>
        Leyendo el plan…
        <ChevronUp size={16} aria-hidden="true" />
      </button>,
      pila,
    );
  }

  if (trabajando) {
    return createPortal(
      <section className="tarjeta-ia" role="status" aria-live="polite">
        <button type="button" className="tarjeta-ia__ocultar" onClick={() => setAchicado(true)} title="Ocultar" aria-label="Ocultar el cartel">
          <ChevronDown size={18} />
        </button>
        <IndicadorIA mensaje="Leyendo el plan con IA" detalle={lectura.nombre} />
        <p className="tarjeta-ia__nota">Podés seguir usando Syntra mientras tanto.</p>
        <button type="button" className="tarjeta-ia__boton tarjeta-ia__boton--secundario" onClick={cancelarLecturaPlan}>
          Cancelar
        </button>
      </section>,
      pila,
    );
  }

  return createPortal(
    <section className="tarjeta-ia tarjeta-ia--lista" role="status" aria-live="polite">
      <span className="tarjeta-ia__icono" aria-hidden="true"><Sparkles size={22} /></span>
      <p className="tarjeta-ia__titulo">
        {lectura.error ? 'No se pudo leer el plan.' : lectura.preguntas ? 'La IA necesita tu ayuda con el plan.' : '¡Listo! Ya se leyó el plan.'}
      </p>
      <div className="tarjeta-ia__acciones">
        <button type="button" className="tarjeta-ia__boton" autoFocus onClick={volver}>Ver</button>
      </div>
    </section>,
    pila,
  );
}
