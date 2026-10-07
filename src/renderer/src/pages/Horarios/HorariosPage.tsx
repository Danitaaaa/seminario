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

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Electron envuelve el error real como "Error invoking remote method '...':
// Error: <mensaje nuestro>". Esto rescata el mensaje de negocio (ej. "Ya
// tenés X cargado ese día...") para mostrarlo tal cual, en vez del genérico.
function extraerMensajeError(err: unknown, generico: string): string {
  const texto = err instanceof Error ? err.message : String(err);
  const partes = texto.split('Error: ');
  return partes.length > 1 ? partes[partes.length - 1] : generico;
}

export function HorariosPage(): JSX.Element {
  const [idActivo, setIdActivo] = useState('horarios');
  const [busqueda, setBusqueda] = useState('');
  const usuarioLogueado = 'Usuario';

  // NUEVO: en vez de listar los 7 días apilados, se navega de a un día por
  // vez (como en el wireframe: "Lunes 7 de Septiembre" con flechas ‹ ›).
  const [fechaActual, setFechaActual] = useState(() => new Date());
  const diaSemanaActual = fechaActual.getDay();

  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('09:00');
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

  function cambiarDia(delta: number): void {
    setFechaActual((prev) => {
      const nueva = new Date(prev);
      nueva.setDate(prev.getDate() + delta);
      return nueva;
    });
  }

  function abrirModalNuevo(): void {
    setEditandoId(null);
    setFormHoraInicio('08:00');
    setFormHoraFin('09:00');
    setFormTitulo('');
    setErrorForm(null);
    setModalAbierto(true);
  }

  function abrirModalEditar(horario: HorarioCursado): void {
    setEditandoId(horario.id);
    setFormHoraInicio(horario.horaInicio);
    setFormHoraFin(horario.horaFin);
    setFormTitulo(horario.titulo);
    setErrorForm(null);
    setModalAbierto(true);
  }

  async function guardarHorario(): Promise<void> {
    if (!formTitulo.trim()) {
      setErrorForm('El nombre de la materia es obligatorio.');
      return;
    }
    if (formHoraFin <= formHoraInicio) {
      setErrorForm('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    try {
      setErrorForm(null);
      if (editandoId !== null) {
        const cambios: ModificarHorarioInput = {
          id: editandoId,
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          titulo: formTitulo.trim(),
        };
        await window.api.modificarHorario(cambios);
      } else {
        const nuevo: CrearHorarioInput = {
          usuarioId: USUARIO_ID_ACTUAL,
          diaSemana: diaSemanaActual,
          horaInicio: formHoraInicio,
          horaFin: formHoraFin,
          titulo: formTitulo.trim(),
        };
        await window.api.crearHorario(nuevo);
      }
      setModalAbierto(false);
      await cargarHorarios();
    } catch (err) {
      console.error('Error al guardar horario:', err);
      // CAMBIO: antes mostraba siempre un mensaje genérico. Ahora, si el
      // backend rechazó por superposición (punto 1 pedido), se ve el
      // mensaje real: "Ya tenés X cargado ese día de HH:MM a HH:MM."
      setErrorForm(
        extraerMensajeError(err, 'No se pudo guardar el horario. Revisá la consola para más detalles.')
      );
    }
  }

  async function eliminarHorario(id: number): Promise<void> {
    await window.api.eliminarHorario({ id });
    await cargarHorarios();
  }

  const horariosDelDia = horarios
    .filter((h) => h.diaSemana === diaSemanaActual)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const tituloFecha = `${NOMBRES_DIA_SEMANA[diaSemanaActual]} ${fechaActual.getDate()} de ${NOMBRES_MES[fechaActual.getMonth()]}`;

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

        <div style={estiloTarjeta}>
          <div style={estiloCabeceraTarjeta}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <button onClick={() => cambiarDia(-1)} style={estiloBotonNav}>‹</button>
              <span style={estiloFechaTitulo}>{tituloFecha}</span>
              <button onClick={() => cambiarDia(1)} style={estiloBotonNav}>›</button>
            </div>
            <button onClick={abrirModalNuevo} style={estiloBotonPrimario}>+ Ingresar Horario</button>
          </div>

          {cargando && <p style={{ color: colors.textSecondary }}>Cargando...</p>}
          {!cargando && horariosDelDia.length === 0 && (
            <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
              Sin clases este día.
            </p>
          )}
          {horariosDelDia.map((h) => (
            <div key={h.id} style={estiloFilaHorario}>
              <div>
                <div style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                  {h.titulo}
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                  Hora: {h.horaInicio} a {h.horaFin}
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing.xs }}>
                <button onClick={() => abrirModalEditar(h)} style={estiloBotonNav}>Editar</button>
                <button onClick={() => eliminarHorario(h.id)} style={{ ...estiloBotonNav, color: colors.error }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {modalAbierto && (
          <div style={estiloOverlay}>
            <div style={estiloModal}>
              <h3 style={estiloTituloModal}>
                {editandoId !== null ? 'Editar Horario' : 'Nuevo Horario'}
              </h3>
              <p style={estiloSubtituloModal}>{tituloFecha}</p>

              <div style={{ display: 'flex', gap: spacing.sm }}>
                <div style={{ flex: 1 }}>
                  <label style={estiloEtiquetaCampo}>Desde</label>
                  <input
                    type="time"
                    value={formHoraInicio}
                    onChange={(e) => setFormHoraInicio(e.target.value)}
                    style={estiloInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={estiloEtiquetaCampo}>Hasta</label>
                  <input
                    type="time"
                    value={formHoraFin}
                    onChange={(e) => setFormHoraFin(e.target.value)}
                    style={estiloInput}
                  />
                </div>
              </div>

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

const estiloTarjeta: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: spacing.md,
};

const estiloCabeceraTarjeta: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.md,
};

const estiloFechaTitulo: React.CSSProperties = {
  fontFamily: typography.fontFamily.body,
  fontWeight: typography.fontWeight.bold,
  fontSize: typography.fontSize.base,
  color: colors.textPrimary,
};

const estiloFilaHorario: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderLeft: `4px solid ${colors.accent}`,
  background: colors.background,
  borderRadius: 6,
  padding: spacing.sm,
  marginBottom: spacing.sm,
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
};

const estiloSubtituloModal: React.CSSProperties = {
  color: colors.surface,
  fontFamily: typography.fontFamily.body,
  fontSize: typography.fontSize.sm,
  textAlign: 'center',
  opacity: 0.85,
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
