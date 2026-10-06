import { useEffect, useState } from 'react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import {
  HorarioCursado,
  CrearHorarioInput,
  ModificarHorarioInput,
  NOMBRES_DIA_SEMANA,
} from '../../types/horarios';

// TODO: reemplazar por el id del usuario logueado (contexto de sesión / auth)
const USUARIO_ID_ACTUAL = 1;

// Lunes primero, domingo al final — es el orden en que se ve una semana de
// cursada, aunque internamente diaSemana siga el criterio de Date.getDay()
// (0 = domingo) para que coincida directo con el calendario.
const ORDEN_VISUAL_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function HorariosPage(): JSX.Element {
  const [idActivo, setIdActivo] = useState('horarios');
  const [busqueda, setBusqueda] = useState('');
  const usuarioLogueado = 'Usuario';

  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [formDiaSemana, setFormDiaSemana] = useState(1); // lunes por defecto
  const [formHora, setFormHora] = useState('08:00');
  const [formTitulo, setFormTitulo] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    cargarHorarios();
  }, []);

  async function cargarHorarios(): Promise<void> {
    setCargando(true);
    try {
      const resultado = await window.api.listarHorarios({ usuarioId: USUARIO_ID_ACTUAL });
      setHorarios(resultado);
    } finally {
      setCargando(false);
    }
  }

  function abrirModalNuevo(diaSemana: number): void {
    setEditandoId(null);
    setFormDiaSemana(diaSemana);
    setFormHora('08:00');
    setFormTitulo('');
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirModalEditar(horario: HorarioCursado): void {
    setEditandoId(horario.id);
    setFormDiaSemana(horario.diaSemana);
    setFormHora(horario.horaInicio);
    setFormTitulo(horario.titulo);
    setErrorForm(null);
    setModalAbierto(true);
  }

  async function guardarHorario(): Promise<void> {
    if (!formTitulo.trim()) {
      setErrorForm('El nombre de la materia es obligatorio.');
      return;
    }

    try {
      setErrorForm(null);
      if (editandoId !== null) {
        const cambios: ModificarHorarioInput = {
          id: editandoId,
          diaSemana: formDiaSemana,
          horaInicio: formHora,
          titulo: formTitulo.trim(),
        };
        await window.api.modificarHorario(cambios);
      } else {
        const nuevo: CrearHorarioInput = {
          usuarioId: USUARIO_ID_ACTUAL,
          diaSemana: formDiaSemana,
          horaInicio: formHora,
          titulo: formTitulo.trim(),
        };
        await window.api.crearHorario(nuevo);
      }
      setModalAbierto(false);
      await cargarHorarios();
    } catch (err) {
      console.error('Error al guardar horario:', err);
      setErrorForm('No se pudo guardar el horario. Revisá la consola para más detalles.');
    }
  }

  async function eliminarHorario(id: number): Promise<void> {
    await window.api.eliminarHorario({ id });
    await cargarHorarios();
  }

  function horariosDelDia(diaSemana: number): HorarioCursado[] {
    return horarios.filter((h) => h.diaSemana === diaSemana);
  }

  return (
    <PlantillaLayout
      titulo="Horarios"
      idActivo={idActivo}
      usuario={{ nombre: usuarioLogueado }}
      onNavegar={setIdActivo}
      onBuscar={setBusqueda}
    >
    <div style={{ padding: spacing.lg }}>
      <h2 style={estiloTituloSeccion}>Horarios de cursado</h2>
      {cargando && <p style={{ color: colors.textSecondary }}>Cargando...</p>}

      {ORDEN_VISUAL_DIAS.map((dia) => (
        <div key={dia} style={estiloBloqueDia}>
          <div style={estiloCabeceraDia}>
            <span style={estiloNombreDia}>{NOMBRES_DIA_SEMANA[dia]}</span>
            <button onClick={() => abrirModalNuevo(dia)} style={estiloBotonPrimario}>
              + Ingresar Horario
            </button>
          </div>

          {horariosDelDia(dia).length === 0 ? (
            <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, margin: 0 }}>
              Sin clases este día.
            </p>
          ) : (
            horariosDelDia(dia).map((h) => (
              <div key={h.id} style={estiloFilaHorario}>
                <div>
                  <div style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                    {h.titulo}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                    Hora: {h.horaInicio}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: spacing.xs }}>
                  <button onClick={() => abrirModalEditar(h)} style={estiloBotonNav}>Editar</button>
                  <button
                    onClick={() => eliminarHorario(h.id)}
                    style={{ ...estiloBotonNav, color: colors.error }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ))}

      {modalAbierto && (
        <div style={estiloOverlay}>
          <div style={estiloModal}>
            <h3 style={estiloTituloModal}>
              {editandoId !== null ? 'Editar Horario' : 'Nuevo Horario'}
            </h3>

            <label style={estiloEtiquetaCampo}>Día</label>
            <select
              value={formDiaSemana}
              onChange={(e) => setFormDiaSemana(Number(e.target.value))}
              style={estiloInput}
            >
              {ORDEN_VISUAL_DIAS.map((dia) => (
                <option key={dia} value={dia}>{NOMBRES_DIA_SEMANA[dia]}</option>
              ))}
            </select>

            <label style={estiloEtiquetaCampo}>Horario</label>
            <input
              type="time"
              value={formHora}
              onChange={(e) => setFormHora(e.target.value)}
              style={estiloInput}
            />

            <label style={estiloEtiquetaCampo}>Materia</label>
            <input
              placeholder="Ingrese título..."
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              style={estiloInput}
            />

            {errorForm && <div style={estiloError}>{errorForm}</div>}

            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
              <button onClick={() => setModalAbierto(false)} style={estiloBotonCancelarModal}>
                Cancelar
              </button>
              <button onClick={guardarHorario} style={estiloBotonGuardarModal}>
                {editandoId !== null ? 'Guardar cambios' : '+'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PlantillaLayout>
  );
}

const estiloTituloSeccion: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.bold,
  color: colors.textPrimary,
  margin: 0,
  marginBottom: spacing.md,
};

const estiloBloqueDia: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.sm,
};

const estiloCabeceraDia: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.sm,
};

const estiloNombreDia: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
  color: colors.textPrimary,
};

const estiloFilaHorario: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTop: `1px solid ${colors.border}`,
  padding: `${spacing.sm} 0`,
};

const estiloBotonNav: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  padding: `${spacing.xs} ${spacing.sm}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
};

const estiloBotonPrimario: React.CSSProperties = {
  background: colors.primary,
  color: colors.surface,
  border: 'none',
  borderRadius: 6,
  padding: `${spacing.xs} ${spacing.md}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.medium,
};

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: spacing.sm,
  marginBottom: spacing.sm,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily.body,
  boxSizing: 'border-box',
};

const estiloEtiquetaCampo: React.CSSProperties = {
  display: 'block',
  color: colors.surface,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  marginBottom: spacing.xs,
};

const estiloOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const estiloModal: React.CSSProperties = {
  background: colors.primaryLight,
  borderRadius: 10,
  padding: spacing.lg,
  width: 380,
};

const estiloTituloModal: React.CSSProperties = {
  color: colors.surface,
  fontFamily: typography.fontFamily.display,
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.bold,
  textAlign: 'center',
  margin: 0,
  marginBottom: spacing.md,
};

const estiloError: React.CSSProperties = {
  background: '#FBEAE9',
  border: `1px solid ${colors.error}`,
  borderRadius: 10,
  padding: `${spacing.sm} ${spacing.md}`,
  color: colors.error,
  fontSize: typography.fontSize.sm,
  textAlign: 'center',
  marginBottom: spacing.sm,
};

const estiloBotonCancelarModal: React.CSSProperties = {
  background: colors.surface,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: `${spacing.xs} ${spacing.lg}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.medium,
};

const estiloBotonGuardarModal: React.CSSProperties = {
  background: colors.primary,
  color: colors.surface,
  border: 'none',
  borderRadius: 999,
  padding: `${spacing.xs} ${spacing.lg}`,
  cursor: 'pointer',
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
};
