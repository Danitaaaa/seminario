import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Evento } from '../../types/eventos';
import { obtenerUsuarioId } from '../../../lib/sesion';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const fechaISO = (anio: number, mes: number, dia: number) => `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

export function MiniCalendario() {
  const navigate = useNavigate();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesIndex, setMesIndex] = useState(hoy.getMonth());
  const [diasConEventos, setDiasConEventos] = useState<Set<number>>(new Set());

  const inicio = new Date(anio, mesIndex, 1).getDay();
  const dias = new Date(anio, mesIndex + 1, 0).getDate();
  const diasMesAnterior = new Date(anio, mesIndex, 0).getDate();
  const diasMesSiguiente = 42 - inicio - dias;

  useEffect(() => {
    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) return;
    window.api.listarEventos({
      usuarioId,
      desde: `${fechaISO(anio, mesIndex, 1)}T00:00:00`,
      hasta: `${fechaISO(anio, mesIndex, dias)}T23:59:59`,
    })
      .then((eventos: Evento[]) => {
        const marcados = eventos
          .map((e) => new Date(e.fecha))
          .filter((f) => f.getFullYear() === anio && f.getMonth() === mesIndex)
          .map((f) => f.getDate());
        setDiasConEventos(new Set(marcados));
      })
      .catch(console.error);
  }, [anio, mesIndex]);

  function cambiarMes(delta: number): void {
    const nuevo = new Date(anio, mesIndex + delta, 1);
    setAnio(nuevo.getFullYear());
    setMesIndex(nuevo.getMonth());
  }

  const esHoy = (dia: number) =>
    dia === hoy.getDate() && mesIndex === hoy.getMonth() && anio === hoy.getFullYear();

  const clasesDia = (dia: number) => {
    const clases = ['calendario__dia'];
    if (esHoy(dia)) clases.push('calendario__dia--hoy');
    if (diasConEventos.has(dia)) clases.push('calendario__dia--evento');
    return clases.join(' ');
  };

  const anios = Array.from({ length: 11 }, (_, i) => hoy.getFullYear() - 5 + i);

  return (
    <div>
      <div className="calendario">
        <div className="calendario__cabecera">
          <button type="button" className="calendario__flecha" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <select className="calendario__select" value={mesIndex} onChange={(e) => setMesIndex(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="calendario__select" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="button" className="calendario__flecha" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendario__grilla">
          {DIAS_SEMANA.map((d, i) => <span key={i} className="calendario__dia-semana">{d}</span>)}

          {Array.from({ length: inicio }, (_, i) => (
            <span key={`a${i}`} className="calendario__dia-ajeno">{diasMesAnterior - inicio + i + 1}</span>
          ))}

          {Array.from({ length: dias }, (_, i) => {
            const dia = i + 1;
            return (
              <button
                key={dia}
                type="button"
                className={clasesDia(dia)}
                onClick={() => navigate('/eventos', { state: { fecha: fechaISO(anio, mesIndex, dia) } })}
              >
                {dia}
              </button>
            );
          })}

          {Array.from({ length: diasMesSiguiente }, (_, i) => (
            <span key={`s${i}`} className="calendario__dia-ajeno">{i + 1}</span>
          ))}
        </div>
      </div>

      <button type="button" className="calendario__link" onClick={() => navigate('/eventos')}>
        Ir a eventos →
      </button>
    </div>
  );
}