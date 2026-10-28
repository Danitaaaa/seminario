import { useEffect, useState } from "react";
import { CalendarDays, Clock, Flag, type LucideIcon } from "lucide-react";
import { obtenerUsuarioId } from "../../../lib/sesion";
import type { HorarioCursado } from "../../types/horarios";
import type { Evento } from "../../types/eventos";
import { EVENTO_METAS_ACTUALIZADAS, type Meta } from "../../types/metas";
import { usarPreferenciaBanner } from "../../hooks/usarPreferenciaBanner";
import {
  fechaLarga, saludoSegunHora, proximaClase, proximoEvento, resumenMetas,
  type Tarjeta, type TipoTarjeta,
} from "../../utils/proximos";
import "../../styles/banner.css";

const INTERVALO_MS = 5000;
const ICONOS: Record<TipoTarjeta, LucideIcon> = { clase: CalendarDays, evento: Clock, metas: Flag };

// Banner de bienvenida del dashboard: saludo y un carrusel con lo próximo.
export function BannerInicio() {
  const usuarioId = obtenerUsuarioId();
  const { tarjetas: elegidas, auto, fondo, posicion } = usarPreferenciaBanner();
  const [nombre, setNombre] = useState("");
  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [imagen, setImagen] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (!usuarioId) return;
    window.api.obtenerPerfil({ id: usuarioId }).then((perfil) => setNombre(perfil.nombre)).catch(() => {});
    window.api.listarHorarios({ usuarioId }).then(setHorarios).catch(() => {});
    window.api.listarEventos({ usuarioId }).then(setEventos).catch(() => {});

    const cargarMetas = () => {
      window.api.listarMetas({ usuarioId }).then(setMetas).catch(() => {});
    };
    cargarMetas();
    window.addEventListener(EVENTO_METAS_ACTUALIZADAS, cargarMetas);
    return () => window.removeEventListener(EVENTO_METAS_ACTUALIZADAS, cargarMetas);
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId || fondo !== "imagen") {
      setImagen(null);
      return;
    }
    window.api.obtenerFondoInicio({ id: usuarioId }).then(setImagen).catch(() => setImagen(null));
  }, [usuarioId, fondo]);

  // Cada minuto se actualizan el saludo y qué clase está en curso.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(reloj);
  }, []);

  const tarjetas = [
    elegidas.clase ? proximaClase(horarios, ahora) : null,
    elegidas.evento ? proximoEvento(eventos, ahora) : null,
    elegidas.metas ? resumenMetas(metas) : null,
  ].filter((t): t is Tarjeta => t !== null);
  const cantidad = tarjetas.length;
  const actual = cantidad > 0 ? indice % cantidad : 0;

  // Pasa sola, salvo que el mouse esté encima, el usuario lo haya apagado o pida menos movimiento.
  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!auto || pausado || quieto || cantidad < 2) return;
    const temporizador = setInterval(() => setIndice((i) => (i + 1) % cantidad), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [auto, pausado, cantidad]);

  if (!usuarioId) return null;

  const conImagen = fondo === "imagen" && imagen !== null;

  return (
    <section
      className={`banner${conImagen ? " banner--imagen" : ""}`}
      style={
        conImagen
          ? { backgroundImage: `url("${imagen}")`, backgroundPosition: `${posicion.x}% ${posicion.y}%` }
          : undefined
      }
      aria-label="Bienvenida"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="banner__texto">
        <p className="banner__fecha">{fechaLarga(ahora)}</p>
        {/* El saludo es el título de la pantalla de inicio */}
        <h1 className="banner__saludo">
          ¡{saludoSegunHora(ahora)}{nombre ? `, ${nombre}` : ""}!
        </h1>
        <p className="banner__frase">
          {cantidad > 0 ? "Esto es lo que tenés por delante." : "No tenés nada pendiente por ahora."}
        </p>
      </div>

      {cantidad > 0 && (
        <div className="banner__carrusel" aria-roledescription="carrusel" aria-label="Lo próximo">
          <div className="banner__ventana">
            <div className="banner__pista" style={{ transform: `translateX(-${actual * 100}%)` }}>
              {tarjetas.map((tarjeta, n) => {
                const Icono = ICONOS[tarjeta.tipo];
                return (
                  <article key={tarjeta.tipo} className="banner__tarjeta" aria-hidden={n !== actual}>
                    <p className="banner__etiqueta">
                      <Icono size={15} aria-hidden="true" />
                      {tarjeta.etiqueta}
                    </p>
                    <p className="banner__titulo">{tarjeta.titulo}</p>
                    <p className="banner__detalle">{tarjeta.detalle}</p>
                  </article>
                );
              })}
            </div>
          </div>

          {cantidad > 1 && (
            <div className="banner__puntos">
              {tarjetas.map((tarjeta, n) => (
                <button
                  key={tarjeta.tipo}
                  type="button"
                  className={`banner__punto${n === actual ? " banner__punto--activo" : ""}`}
                  aria-label={`Ver ${tarjeta.etiqueta.toLowerCase()}`}
                  aria-current={n === actual}
                  onClick={() => setIndice(n)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}