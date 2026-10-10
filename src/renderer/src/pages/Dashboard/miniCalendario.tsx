import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors } from '../../estilos/colors';
import { typography } from '../../estilos/typography';
import { spacing } from '../../estilos/spacing';
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

  const anios = Array.from({ length: 11 }, (_, i) => hoy.getFullYear() - 5 + i);

  return (
    <div>
      <div style={estiloTarjeta}>
        <div style={estiloCabecera}>
          <button onClick={() => cambiarMes(-1)} style={estiloFlecha} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <select value={mesIndex} onChange={(e) => setMesIndex(Number(e.target.value))} style={estiloSelect}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={estiloSelect}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => cambiarMes(1)} style={estiloFlecha} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={estiloGrilla}>
          {DIAS_SEMANA.map((d, i) => <span key={i} style={estiloDiaSemana}>{d}</span>)}

          {Array.from({ length: inicio }, (_, i) => (
            <span key={`a${i}`} style={estiloDiaAjeno}>{diasMesAnterior - inicio + i + 1}</span>
          ))}

          {Array.from({ length: dias }, (_, i) => {
            const dia = i + 1;
            const conEvento = diasConEventos.has(dia);
            return (
              <button
                key={dia}
                onClick={() => navigate('/eventos', { state: { fecha: fechaISO(anio, mesIndex, dia) } })}
                style={{
                  ...estiloDia,
                  background: conEvento ? colors.textPrimary : esHoy(dia) ? colors.background : 'transparent',
                  color: conEvento ? colors.surface : colors.textPrimary,
                  fontWeight: esHoy(dia) ? typography.fontWeight.bold : undefined,
                }}
              >
                {dia}
              </button>
            );
          })}

          {Array.from({ length: diasMesSiguiente }, (_, i) => (
            <span key={`s${i}`} style={estiloDiaAjeno}>{i + 1}</span>
          ))}
        </div>
      </div>

      <button onClick={() => navigate('/eventos')} style={estiloLinkEventos}>
        Ir a eventos →
      </button>
    </div>
  );
}

const estiloTarjeta: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: spacing.md,
};

const estiloCabecera: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.xs,
  marginBottom: spacing.sm,
};

const estiloFlecha: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  color: colors.textPrimary,
};

const estiloSelect: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
};

const estiloGrilla: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 4,
  textAlign: 'center',
};

const estiloDiaSemana: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
};

const estiloDia: React.CSSProperties = {
  height: 28,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
};

const estiloDiaAjeno: React.CSSProperties = {
  lineHeight: '28px',
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  color: colors.border,
};

const estiloLinkEventos: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  marginTop: spacing.xs,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
  textDecoration: 'underline',
};