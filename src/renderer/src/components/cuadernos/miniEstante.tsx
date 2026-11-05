import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import type { ResumenCuaderno } from '../../types/cuadernos';
import { LOMOS_DE_MUESTRA, altoLomo, cuadernosCursando, fechaCorta, progresoNotas, tonoDe } from '../../pages/cuadernos/utilidadesCuadernos';
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

  // Sin cuadernos: estante simulado que invita a crear el primero.
  if (cuadernos.length === 0) {
    return (
      <aside className="mini-estante">
        <span className="mini-estante__cabecera"><span className="mini-estante__punto" aria-hidden="true" /> Mis cuadernos</span>
        <button type="button" className="mini-estante__estante" onClick={() => navigate('/cuadernos?nuevo=1')} aria-label="Crear un cuaderno">
          {LOMOS_DE_MUESTRA.map((alto, i) => (
            <span key={i} className="mini-estante__lomo mini-estante__lomo--muestra" style={{ height: `${alto}%` }} />
          ))}
          <span className="mini-estante__mas" aria-hidden="true">+</span>
        </button>
        <p className="mini-estante__vacio">Creá un cuaderno por materia y juntá ahí su material, flashcards y notas.</p>
        <button type="button" className="mini-estante__ver" onClick={() => navigate('/cuadernos?nuevo=1')}>Crear cuaderno</button>
      </aside>
    );
  }

  const cursando = cuadernosCursando(cuadernos);
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
          <button type="button" className="mini-estante__estante" onClick={() => navigate('/cuadernos')} aria-label="Ver el estante">
            {/* Todos los cuadernos, como libros en el estante. */}
            {cuadernos.slice(0, 18).map((c) => (
              <span key={c.idCuaderno} className={`mini-estante__lomo cuaderno-tono-${tonoDe(c.idCuaderno)}`} style={{ height: `${altoLomo(c.nombre)}%` }} title={c.nombre} />
            ))}
          </button>

          {destacado?.proximo && (
            <button type="button" className="mini-estante__destacado" onClick={() => navigate(`/cuadernos/${destacado.idCuaderno}`)}>
              <small>Próximo: {destacado.proximo.nombre} · {fechaCorta(destacado.proximo.fecha)}</small>
            </button>
          )}
          {destacado && destacado.notasTotal > 0 && (
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
