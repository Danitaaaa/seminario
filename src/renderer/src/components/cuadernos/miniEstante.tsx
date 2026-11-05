import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import type { ResumenCuaderno } from '../../types/cuadernos';
import { agruparCuadernos, altoLomo, fechaCorta, progresoNotas, tonoDe } from '../../pages/cuadernos/utilidadesCuadernos';
import '../../styles/cuadernos.css';

// Tarjeta al costado de Material con el estante en chiquito; lleva a "Mis cuadernos".
export function MiniEstante() {
  const navigate = useNavigate();
  const [cuadernos, setCuadernos] = useState<ResumenCuaderno[] | null>(null);
  const [abierto, setAbierto] = usarPreferencia('material-estante-abierto', true);

  useEffect(() => {
    window.api.listarCuadernos({ usuarioId: obtenerUsuarioId() ?? 0 })
      .then(setCuadernos)
      .catch(() => setCuadernos([]));
  }, []);

  if (!cuadernos) return null;
  if (cuadernos.length === 0) {
    return (
      <aside className="mini-estante">
        <span className="mini-estante__cabecera"><span className="mini-estante__punto" aria-hidden="true" /> Mis cuadernos</span>
        <p className="mini-estante__vacio">Cargá tus materias y cada una tiene su cuaderno, con su material, flashcards y notas.</p>
        <button type="button" className="mini-estante__ver" onClick={() => navigate('/materias')}>Cargar materias</button>
      </aside>
    );
  }
  const { cursando, estante } = agruparCuadernos(cuadernos);
  const destacado = cursando.find((c) => c.proximo) ?? cursando[0];

  return (
    <aside className="mini-estante">
      <button type="button" className="mini-estante__cabecera" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        <span className="mini-estante__punto" aria-hidden="true" />
        Mis cuadernos · {cursando.length} cursando
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <>
          {estante.length > 0 && (
            <button type="button" className="mini-estante__estante" onClick={() => navigate('/cuadernos')} aria-label="Ver el estante">
              {estante.slice(0, 18).map((c) => (
                <span key={c.idMateria} className={`mini-estante__lomo cuaderno-tono-${tonoDe(c.idMateria)}`} style={{ height: `${altoLomo(c.nombre)}%` }} title={c.nombre} />
              ))}
            </button>
          )}

          {destacado && (
            <button type="button" className="mini-estante__destacado" onClick={() => navigate(`/cuadernos/${destacado.idMateria}`)}>
              <span className={`mini-estante__tapa cuaderno-tono-${tonoDe(destacado.idMateria)}`} aria-hidden="true" />
              <span>
                <strong>{destacado.nombre}</strong>
                <small>{destacado.proximo ? `Próximo: ${destacado.proximo.nombre} · ${fechaCorta(destacado.proximo.fecha)}` : 'Sin fechas cargadas'}</small>
              </span>
            </button>
          )}
          {destacado && (
            <span className="mini-estante__progreso" aria-hidden="true">
              <span style={{ width: `${progresoNotas(destacado) * 100}%` }} />
            </span>
          )}

          <button type="button" className="mini-estante__ver" onClick={() => navigate('/cuadernos')}>Ver estante</button>
        </>
      )}
    </aside>
  );
}
