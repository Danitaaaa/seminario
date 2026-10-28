import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, ArrowRight } from 'lucide-react';
import { cssVar as colors } from '../../styles/variables';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import type { Meta } from '../../types/metas';
import { obtenerUsuarioId } from '../../../lib/sesion';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const claveMes = (anio: number, mesIndex: number) => `${anio}-${dosDigitos(mesIndex + 1)}`;
// 'AAAA-MM' -> 'Octubre'
const nombreMes = (clave: string) => MESES[Number(clave.slice(5, 7)) - 1];

interface MetasMensualesProps {
  idProyecto: number;
  /** false para lectores: ven las metas pero no pueden marcarlas ni editarlas. */
  puedeEditar?: boolean;
  /** true para el propietario: es el único que puede borrar metas. */
  puedeEliminar?: boolean;
}

export function MetasMensuales({ idProyecto, puedeEditar = true, puedeEliminar = false }: MetasMensualesProps) {
  // Sin sesión queda en 0 y el main rechaza los pedidos.
  const ID_USUARIO_ACTUAL = obtenerUsuarioId() ?? 0;
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesIndex, setMesIndex] = useState(hoy.getMonth());
  const [metas, setMetas] = useState<Meta[]>([]);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tituloEditado, setTituloEditado] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mes = claveMes(anio, mesIndex);
  const mesAnterior = (() => {
    const d = new Date(anio, mesIndex - 1, 1);
    return claveMes(d.getFullYear(), d.getMonth());
  })();

  const cargar = useCallback(async () => {
    try {
      const resultado: Meta[] = await window.api.listarMetas({
        idProyecto,
        idUsuario: ID_USUARIO_ACTUAL,
        mes,
      });
      setMetas(resultado);
      setError(null);
    } catch (e) {
      console.error('No se pudieron cargar las metas', e);
      setError('No se pudieron cargar las metas.');
    }
  }, [idProyecto, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiarMes(delta: number): void {
    const nuevo = new Date(anio, mesIndex + delta, 1);
    setAnio(nuevo.getFullYear());
    setMesIndex(nuevo.getMonth());
  }

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string): Promise<void> {
    try {
      await accion();
      setError(null);
    } catch (e) {
      console.error(mensaje, e);
      setError(mensaje);
    } finally {
      await cargar();
    }
  }

  async function agregar(): Promise<void> {
    const titulo = nuevoTitulo.trim();
    if (!titulo) return;
    setNuevoTitulo('');
    await ejecutar(
      () => window.api.crearMeta({ idProyecto, idUsuario: ID_USUARIO_ACTUAL, titulo, mes }),
      'No se pudo agregar la meta.',
    );
  }

  async function alternar(meta: Meta): Promise<void> {
    if (!puedeEditar || meta.trasladadaA) return;
    // Actualización optimista: se refleja al instante y se reconcilia al recargar
    setMetas((prev) => prev.map((m) => (m.idMeta === meta.idMeta ? { ...m, completada: !m.completada } : m)));
    await ejecutar(
      () => window.api.alternarMeta({ idMeta: meta.idMeta, idUsuario: ID_USUARIO_ACTUAL }),
      'No se pudo actualizar la meta.',
    );
  }

  async function guardarTitulo(meta: Meta): Promise<void> {
    const titulo = tituloEditado.trim();
    setEditandoId(null);
    if (!titulo || titulo === meta.titulo) return;
    await ejecutar(
      () => window.api.modificarMeta({ idMeta: meta.idMeta, idUsuario: ID_USUARIO_ACTUAL, titulo }),
      'No se pudo renombrar la meta.',
    );
  }

  async function eliminar(meta: Meta): Promise<void> {
    if (!window.confirm(`¿Eliminar la meta "${meta.titulo}"?`)) return;
    await ejecutar(
      () => window.api.eliminarMeta({ idMeta: meta.idMeta, idUsuario: ID_USUARIO_ACTUAL }),
      'No se pudo eliminar la meta.',
    );
  }

  // Pasa las metas pendientes del mes anterior a este; en el mes anterior quedan tachadas como trasladadas
  async function trasladarPendientes(): Promise<void> {
    await ejecutar(
      () => window.api.copiarMetas({
        idProyecto,
        idUsuario: ID_USUARIO_ACTUAL,
        mesOrigen: mesAnterior,
        mesDestino: mes,
        soloPendientes: true,
      }),
      'No se pudieron trasladar las metas.',
    );
  }

  // Las trasladadas no se cuentan en el progreso: se cumplen (o no) en el mes al que se pasaron
  const activas = metas.filter((m) => !m.trasladadaA);
  const trasladadas = metas.length - activas.length;
  const total = activas.length;
  const completadas = activas.filter((m) => m.completada).length;
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);

  return (
    <div style={estiloContenedor}>
      <div style={estiloCabecera}>
        <button onClick={() => cambiarMes(-1)} style={estiloFlecha} aria-label="Mes anterior">
          <ChevronLeft size={16} />
        </button>
        <span style={estiloMes}>{MESES[mesIndex]} {anio}</span>
        <button onClick={() => cambiarMes(1)} style={estiloFlecha} aria-label="Mes siguiente">
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={estiloResumen}>
        <span>
          {total === 0 ? 'Sin metas' : `${completadas} de ${total} completadas`}
          {trasladadas > 0 && ` · ${trasladadas} trasladada${trasladadas > 1 ? 's' : ''}`}
        </span>
        {total > 0 && <span>{porcentaje}%</span>}
      </div>
      <div style={estiloBarraFondo} aria-hidden="true">
        <div style={{ ...estiloBarraRelleno, width: `${porcentaje}%` }} />
      </div>

      {error && <div style={estiloError}>{error}</div>}

      <ul style={estiloLista}>
        {metas.map((meta) => {
          const trasladada = meta.trasladadaA !== null;
          const tachada = meta.completada || trasladada;

          return (
            <li key={meta.idMeta} style={estiloFila}>
              {trasladada ? (
                <span
                  style={estiloCasillaTrasladada}
                  title={`Pasó a ${nombreMes(meta.trasladadaA!)}`}
                  aria-label={`Meta trasladada a ${nombreMes(meta.trasladadaA!)}`}
                >
                  <ArrowRight size={12} />
                </span>
              ) : (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={meta.completada}
                  aria-label={meta.completada ? 'Desmarcar meta' : 'Marcar meta como completada'}
                  disabled={!puedeEditar}
                  onClick={() => alternar(meta)}
                  style={{
                    ...estiloCasilla,
                    background: meta.completada ? colors.secondary : 'transparent',
                    borderColor: meta.completada ? colors.secondary : colors.border,
                    cursor: puedeEditar ? 'pointer' : 'default',
                  }}
                >
                  {meta.completada && <Check size={12} style={{ color: colors.white }} strokeWidth={3} />}
                </button>
              )}

              {editandoId === meta.idMeta ? (
                <input
                  autoFocus
                  value={tituloEditado}
                  onChange={(e) => setTituloEditado(e.target.value)}
                  onBlur={() => guardarTitulo(meta)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarTitulo(meta);
                    if (e.key === 'Escape') setEditandoId(null);
                  }}
                  maxLength={200}
                  style={estiloInputInline}
                />
              ) : (
                <span
                  onClick={() => {
                    if (!puedeEditar || trasladada) return;
                    setEditandoId(meta.idMeta);
                    setTituloEditado(meta.titulo);
                  }}
                  title={puedeEditar && !trasladada ? 'Tocar para editar' : undefined}
                  style={{
                    ...estiloTitulo,
                    textDecoration: tachada ? 'line-through' : 'none',
                    color: tachada ? colors.textSecondary : colors.textPrimary,
                    cursor: puedeEditar && !trasladada ? 'text' : 'default',
                  }}
                >
                  {meta.titulo}
                </span>
              )}

              {trasladada && (
                <span style={estiloEtiquetaTraslado}>→ {nombreMes(meta.trasladadaA!)}</span>
              )}

              {puedeEliminar && (
                <button
                  type="button"
                  onClick={() => eliminar(meta)}
                  style={estiloQuitar}
                  aria-label={`Eliminar meta ${meta.titulo}`}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {puedeEditar && (
        <>
          <input
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
            placeholder="+ Agregar meta"
            maxLength={200}
            style={estiloInputNuevo}
          />
          {total === 0 && (
            <button type="button" onClick={trasladarPendientes} style={estiloLink}>
              Traer pendientes de {nombreMes(mesAnterior).toLowerCase()}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const estiloContenedor: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
  fontFamily: typography.fontFamily.body,
};

const estiloCabecera: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const estiloFlecha: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  color: colors.textPrimary,
};

const estiloMes: React.CSSProperties = {
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.bold,
  color: colors.textPrimary,
};

const estiloResumen: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
};

const estiloBarraFondo: React.CSSProperties = {
  height: 6,
  borderRadius: 3,
  background: colors.border,
  overflow: 'hidden',
};

const estiloBarraRelleno: React.CSSProperties = {
  height: '100%',
  background: colors.secondary,
  transition: 'width 0.2s ease',
};

const estiloError: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  background: colors.errorBg,
  color: colors.error,
  fontSize: typography.fontSize.xs,
};

const estiloLista: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const estiloFila: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
};

const estiloCasilla: React.CSSProperties = {
  flexShrink: 0,
  width: 18,
  height: 18,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1.5px solid',
  borderRadius: 5,
};

const estiloCasillaTrasladada: React.CSSProperties = {
  flexShrink: 0,
  width: 18,
  height: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.textSecondary,
};

const estiloTitulo: React.CSSProperties = {
  flex: 1,
  fontSize: typography.fontSize.sm,
  wordBreak: 'break-word',
};

const estiloEtiquetaTraslado: React.CSSProperties = {
  flexShrink: 0,
  fontSize: typography.fontSize.xs,
  color: colors.accent,
};

const estiloInputInline: React.CSSProperties = {
  flex: 1,
  padding: '2px 6px',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
};

const estiloQuitar: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  display: 'flex',
  cursor: 'pointer',
  color: colors.textSecondary,
};

const estiloInputNuevo: React.CSSProperties = {
  marginTop: spacing.xs,
  padding: '6px 8px',
  borderRadius: 6,
  border: `1px dashed ${colors.border}`,
  background: 'transparent',
  color: colors.textPrimary,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
};

const estiloLink: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
  textDecoration: 'underline',
};