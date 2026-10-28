import { useEffect, useState, type FormEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { EVENTO_METAS_ACTUALIZADAS, mesDe, type Meta } from "../../types/metas";
import { usarPreferenciaMetas } from "../../hooks/usarPreferenciaMetas";
import "../../styles/metas.css";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

function aTexto(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Texto corto de la fecha y si hay que llamar la atención (vence hoy o ya venció).
function etiquetaFecha(meta: Meta): { texto: string; alerta: boolean } | null {
  if (!meta.fechaLimite) return null;
  const hoy = aTexto(new Date());
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);

  if (!meta.completada && meta.fechaLimite < hoy) return { texto: "Vencida", alerta: true };
  if (!meta.completada && meta.fechaLimite === hoy) return { texto: "Vence hoy", alerta: true };
  if (meta.fechaLimite === hoy) return { texto: "Hoy", alerta: false };
  if (meta.fechaLimite === aTexto(manana)) return { texto: "Mañana", alerta: false };

  const [, mes, dia] = meta.fechaLimite.split("-").map(Number);
  return { texto: `${dia} ${MESES[mes - 1]}`, alerta: false };
}

// "Mis metas" del dashboard: las metas personales del mes, en el estilo que el usuario eligió en Ajustes.
// Son las mismas metas que usan los proyectos, pero sin proyecto.
export function MetasDashboard() {
  const usuarioId = obtenerUsuarioId();
  const { visible, estilo, mostrar } = usarPreferenciaMetas();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuarioId || !visible) return;
    window.api.listarMetas({ idUsuario: usuarioId, mes: mesDe(new Date()) })
      .then(setMetas)
      .catch((e) => setError(mensajeDe(e)));
  }, [usuarioId, visible]);

  if (!usuarioId || !visible) return null;

  // El banner de inicio muestra cuántas metas quedan: se le avisa de cada cambio.
  const avisarCambio = () => window.dispatchEvent(new Event(EVENTO_METAS_ACTUALIZADAS));

  const completa = estilo === "completa";
  const conFechas = completa && mostrar.fechas;
  const hechas = metas.filter((m) => m.completada).length;

  const agregar = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    try {
      const nueva = await window.api.crearMeta({
        idUsuario: usuarioId,
        titulo,
        mes: mesDe(new Date()),
        fechaLimite: conFechas && fecha ? fecha : null,
      });
      setMetas((actuales) => [...actuales, nueva]);
      avisarCambio();
      setTitulo("");
      setFecha("");
      setError("");
    } catch (err) {
      setError(mensajeDe(err));
    }
  };

  const alternar = async (meta: Meta) => {
    try {
      const actualizada = await window.api.alternarMeta({ idMeta: meta.idMeta, idUsuario: usuarioId, completada: !meta.completada });
      setMetas((actuales) => actuales.map((m) => (m.idMeta === meta.idMeta ? actualizada : m)));
      avisarCambio();
    } catch (err) {
      setError(mensajeDe(err));
    }
  };

  const eliminar = async (meta: Meta) => {
    try {
      await window.api.eliminarMeta({ idMeta: meta.idMeta, idUsuario: usuarioId });
      setMetas((actuales) => actuales.filter((m) => m.idMeta !== meta.idMeta));
      avisarCambio();
    } catch (err) {
      setError(mensajeDe(err));
    }
  };

  return (
    <section className={`metas metas--${estilo}`} aria-label="Mis metas">
      <header className="metas__cabecera">
        <h3 className="metas__titulo">Mis metas</h3>
        {completa && mostrar.contador && metas.length > 0 && (
          <span className="metas__contador">{hechas} de {metas.length}</span>
        )}
      </header>

      {completa && mostrar.progreso && metas.length > 0 && (
        <div
          className="metas__progreso"
          role="progressbar"
          aria-label="Metas cumplidas"
          aria-valuemin={0}
          aria-valuemax={metas.length}
          aria-valuenow={hechas}
        >
          <div className="metas__progreso-barra" style={{ width: `${(hechas / metas.length) * 100}%` }} />
        </div>
      )}

      <ul className="metas__lista">
        {metas.length === 0 && <li className="metas__vacio">Todavía no anotaste metas.</li>}
        {metas.map((meta) => {
          const etiqueta = conFechas ? etiquetaFecha(meta) : null;
          return (
            <li key={meta.idMeta} className={`metas__item${meta.completada ? " metas__item--hecha" : ""}`}>
              <button
                type="button"
                className="metas__alternar"
                role="checkbox"
                aria-checked={meta.completada}
                onClick={() => alternar(meta)}
              >
                {completa && (
                  <span className="metas__casilla" aria-hidden="true">
                    {meta.completada && <Check size={14} strokeWidth={3} />}
                  </span>
                )}
                {estilo === "minimalista" && <span className="metas__punto" aria-hidden="true" />}
                <span className="metas__texto">{meta.titulo}</span>
              </button>
              {etiqueta && (
                <span className={`metas__fecha${etiqueta.alerta ? " metas__fecha--alerta" : ""}`}>
                  {etiqueta.texto}
                </span>
              )}
              <button
                type="button"
                className="metas__eliminar"
                aria-label={`Eliminar "${meta.titulo}"`}
                onClick={() => eliminar(meta)}
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <form className="metas__nueva" onSubmit={agregar}>
        <input
          className="metas__input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={completa ? "Nueva meta…" : estilo === "minimalista" ? "+ Escribí una meta…" : "Escribí una meta…"}
          maxLength={200}
          aria-label="Nueva meta"
        />
        {completa && (
          <button type="submit" className="metas__agregar" aria-label="Agregar meta">
            <Plus size={18} />
          </button>
        )}
        {conFechas && (
          <input
            type="date"
            className="metas__input metas__input--fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha límite (opcional)"
          />
        )}
      </form>

      {error && <p className="metas__error">{error}</p>}
    </section>
  );
}