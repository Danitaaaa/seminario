import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CalendarDays, Target, Timer, Briefcase, type LucideIcon } from "lucide-react";
import { obtenerUsuarioId } from "../../../lib/sesion";
import type { Notificacion, TipoNotificacion } from "../../types/notificaciones";
import { rutaDeNotificacion, textoContador, tiempoRelativo } from "../../utils/notificaciones";
import { sonarNotificacion } from "../../utils/sonidoNotificacion";
import "../../styles/notificaciones.css";

const ICONOS: Record<TipoNotificacion, LucideIcon> = {
  evento: CalendarDays,
  meta: Target,
  sesion: Timer,
  proyecto: Briefcase,
};

// Campanita de la barra superior: muestra los avisos y permite silenciar los de la compu.
export function MenuNotificaciones() {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [silenciadas, setSilenciadas] = useState(false);
  const [error, setError] = useState("");

  const cargar = () => {
    if (!usuarioId) return;
    window.api.listarNotificaciones({ usuarioId }).then(setLista).catch(() => {});
  };

  useEffect(() => {
    if (!usuarioId) return;
    cargar();
    window.api.obtenerSilencioNotificaciones({ usuarioId }).then(setSilenciadas).catch(() => {});
    window.api.vigilarNotificaciones({ usuarioId }).catch(console.error);
    const dejarDeEscuchar = window.api.alLlegarNotificacion(cargar);
    const dejarDeEscucharSonido = window.api.alSonarNotificacion(sonarNotificacion);
    const dejarDeEscucharClic = window.api.alTocarNotificacion(() => {
      cargar();
      setAbierto(true);
    });
    return () => {
      dejarDeEscuchar();
      dejarDeEscucharSonido();
      dejarDeEscucharClic();
      // Al salir de las pantallas con barra (ej. cerrar sesión) se deja de vigilar.
      window.api.detenerNotificaciones().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alApretar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, [abierto]);

  const sinLeer = lista.filter((n) => !n.leida).length;
  const ahora = new Date();
  const inicioDeHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const esDeHoy = (n: Notificacion) => new Date(n.fecha) >= inicioDeHoy;
  // Los de días anteriores van en su propia sección: su texto ("vence hoy") era del día en que salieron.
  const secciones = [
    { titulo: "Hoy", avisos: lista.filter(esDeHoy) },
    { titulo: "Anteriores", avisos: lista.filter((n) => !esDeHoy(n)) },
  ].filter((s) => s.avisos.length > 0);

  async function alternarSilencio(): Promise<void> {
    if (!usuarioId) return;
    setError("");
    try {
      setSilenciadas(await window.api.silenciarNotificaciones({ usuarioId, silenciadas: !silenciadas }));
    } catch {
      setError("No se pudo cambiar. Probá de nuevo.");
    }
  }

  async function marcarTodas(): Promise<void> {
    if (!usuarioId) return;
    await window.api.marcarNotificacionesLeidas({ usuarioId }).catch(() => {});
    setLista((l) => l.map((n) => ({ ...n, leida: true })));
  }

  async function borrarLeidas(): Promise<void> {
    if (!usuarioId) return;
    setError("");
    try {
      await window.api.borrarNotificacionesLeidas({ usuarioId });
      setLista((l) => l.filter((n) => !n.leida));
    } catch {
      setError("No se pudieron borrar. Probá de nuevo.");
    }
  }

  function abrirAviso(n: Notificacion): void {
    if (usuarioId && !n.leida) window.api.marcarNotificacionesLeidas({ usuarioId, ids: [n.id] }).catch(() => {});
    setAbierto(false);
    navigate(rutaDeNotificacion(n.tipo));
  }

  const IconoCampana = silenciadas ? BellOff : Bell;

  return (
    <>
      <button
        type="button"
        className="app-boton-icono notificaciones__boton"
        aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones"}
        title="Notificaciones"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <IconoCampana size={20} />
        {sinLeer > 0 && <span className="notificaciones__contador">{textoContador(sinLeer)}</span>}
      </button>

      {abierto && (
        <div className="notificaciones__fondo" onClick={() => setAbierto(false)}>
          <div className="notificaciones" role="dialog" aria-label="Notificaciones" onClick={(e) => e.stopPropagation()}>
            <header className="notificaciones__cabecera">
              <h2 className="notificaciones__titulo">Notificaciones</h2>
              <button
                type="button"
                className={`notificaciones__silenciar${silenciadas ? " notificaciones__silenciar--activo" : ""}`}
                aria-pressed={silenciadas}
                title={silenciadas ? "Volver a recibir avisos en la compu" : "Silenciar avisos en la compu"}
                onClick={alternarSilencio}
              >
                {silenciadas ? <BellOff size={16} /> : <Bell size={16} />}
                {silenciadas ? "Silenciadas" : "Silenciar"}
              </button>
            </header>

            {silenciadas && (
              <p className="notificaciones__nota">Los avisos se guardan acá, pero no aparecen en la compu.</p>
            )}
            {error && <p className="notificaciones__error">{error}</p>}

            {lista.length === 0 ? (
              <p className="notificaciones__vacio">No tenés notificaciones.</p>
            ) : (
              <>
                <div className="notificaciones__acciones">
                  {lista.length > sinLeer && (
                    <button type="button" className="notificaciones__marcar" onClick={borrarLeidas}>
                      Borrar leídas
                    </button>
                  )}
                  {sinLeer > 0 && (
                    <button type="button" className="notificaciones__marcar" onClick={marcarTodas}>
                      Marcar todo como leído
                    </button>
                  )}
                </div>
                <ul className="notificaciones__lista">
                  {secciones.flatMap((s) => [
                    <li key={s.titulo} className="notificaciones__seccion">{s.titulo}</li>,
                    ...s.avisos.map((n) => {
                    const Icono = ICONOS[n.tipo] ?? Bell;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`notificaciones__aviso${n.leida ? "" : " notificaciones__aviso--nuevo"}`}
                          onClick={() => abrirAviso(n)}
                        >
                          <span className={`notificaciones__icono notificaciones__icono--${n.tipo}`} aria-hidden="true">
                            <Icono size={16} />
                          </span>
                          <span className="notificaciones__texto">
                            <span className="notificaciones__aviso-titulo">{n.titulo}</span>
                            {n.mensaje && <span className="notificaciones__aviso-mensaje">{n.mensaje}</span>}
                            <span className="notificaciones__aviso-hora">{tiempoRelativo(new Date(n.fecha), ahora)}</span>
                          </span>
                          {!n.leida && <span className="notificaciones__punto" aria-label="Sin leer" />}
                        </button>
                      </li>
                    );
                    }),
                  ])}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}