import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import type { HorarioCursado } from "../../types/horarios";
import type { Evento } from "../../types/eventos";
import type { Meta } from "../../types/metas";
import {
  armarSemana, fechaISO, inicioDeSemana, rangoDeHoras, sumarDias, textoHora, tituloSemana,
  type BloqueUbicado, type DiaCronograma,
} from "../../utils/cronograma";
import { claseTono } from "../../utils/tonos";
import { CronogramaProyectos } from "../../components/cronograma/cronogramaProyectos";
import "../../styles/cronograma.css";

type Vista = "mio" | "proyectos";
type Filtro = "clase" | "evento" | "meta";

const PX_POR_HORA = 48;
const NOMBRES_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: "clase", nombre: "Clases" },
  { id: "evento", nombre: "Eventos" },
  { id: "meta", nombre: "Metas" },
];

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

export function CronogramaPage() {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();
  const [vista, setVista] = useState<Vista>("mio");
  const [inicio, setInicio] = useState(() => inicioDeSemana(new Date()));
  const [horarios, setHorarios] = useState<HorarioCursado[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [ocultos, setOcultos] = useState<Record<Filtro, boolean>>({ clase: false, evento: false, meta: false });
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (!usuarioId) {
      navigate("/");
      return;
    }
    Promise.all([
      window.api.listarHorarios({ usuarioId }),
      window.api.listarEventos({ usuarioId }),
    ])
      .then(([h, e]) => {
        setHorarios(h);
        setEventos(e);
      })
      .catch((e) => setError(mensajeDe(e)));
  }, []);

  // Las metas personales se piden por semana: las que vencen entre el lunes y el domingo que se ven.
  useEffect(() => {
    if (!usuarioId) return;
    window.api.listarMetas({ idUsuario: usuarioId, desde: fechaISO(inicio), hasta: fechaISO(sumarDias(inicio, 6)) })
      .then(setMetas)
      .catch((e) => setError(mensajeDe(e)));
  }, [inicio]);

  // La línea de "ahora" se mueve sola.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(reloj);
  }, []);

  const dias = armarSemana(
    inicio,
    ocultos.clase ? [] : horarios,
    ocultos.evento ? [] : eventos,
    ocultos.meta ? [] : metas,
  );
  const { desde, hasta } = rangoDeHoras(dias);
  const horas = Array.from({ length: (hasta - desde) / 60 }, (_, i) => desde + i * 60);
  const hoy = fechaISO(ahora);
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
  const semanaVacia = dias.every((d) => d.bloques.length === 0 && d.metas.length === 0 && d.eventosTodoElDia.length === 0);
  const hayFilaSuperior = dias.some((d) => d.metas.length > 0 || d.eventosTodoElDia.length > 0);

  const abrir = (dia: DiaCronograma, bloque: BloqueUbicado) =>
    bloque.tipo === "clase" ? navigate("/horarios") : navigate("/eventos", { state: { fecha: dia.iso } });

  return (
    <PlantillaLayout titulo="Cronograma" idActivo="cronograma" usuario={{ nombre: "" }}>
      <div className="cronograma">
        <div className="cronograma__barra">
          <div className="cronograma__pestanas" role="tablist" aria-label="Vista del cronograma">
            <button
              type="button" role="tab" aria-selected={vista === "mio"}
              className={`cronograma__pestana${vista === "mio" ? " cronograma__pestana--activa" : ""}`}
              onClick={() => setVista("mio")}
            >
              Mi cronograma
            </button>
            <button
              type="button" role="tab" aria-selected={vista === "proyectos"}
              className={`cronograma__pestana${vista === "proyectos" ? " cronograma__pestana--activa" : ""}`}
              onClick={() => setVista("proyectos")}
            >
              Proyectos
            </button>
          </div>

          {vista === "mio" && (
            <div className="cronograma__semana">
              <button type="button" className="cronograma__flecha" aria-label="Semana anterior" onClick={() => setInicio(sumarDias(inicio, -7))}>
                <ChevronLeft size={18} />
              </button>
              <span className="cronograma__titulo-semana">{tituloSemana(inicio)}</span>
              <button type="button" className="cronograma__flecha" aria-label="Semana siguiente" onClick={() => setInicio(sumarDias(inicio, 7))}>
                <ChevronRight size={18} />
              </button>
              <button type="button" className="cronograma__hoy" onClick={() => setInicio(inicioDeSemana(new Date()))}>
                Hoy
              </button>
            </div>
          )}
        </div>

        {vista === "proyectos" ? (
          usuarioId && <CronogramaProyectos idUsuario={usuarioId} eventos={eventos} />
        ) : (
          <>
            <div className="cronograma__filtros">
              <span className="cronograma__filtros-texto">Mostrar:</span>
              {FILTROS.map(({ id, nombre }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={!ocultos[id]}
                  className={`cronograma__filtro${ocultos[id] ? "" : " cronograma__filtro--activo"}`}
                  onClick={() => setOcultos((o) => ({ ...o, [id]: !o[id] }))}
                >
                  <span className={`cronograma__muestra cronograma__muestra--${id}`} aria-hidden="true" />
                  {nombre}
                </button>
              ))}
              {semanaVacia && <span className="cronograma__vacio">No tenés nada esta semana.</span>}
            </div>
            {error && <p className="cronograma__error">{error}</p>}

            <div className="cronograma__grilla">
              <div className="cronograma__fila cronograma__fila--cabecera">
                <span />
                {dias.map((dia, i) => (
                  <div key={dia.iso} className={`cronograma__dia${dia.iso === hoy ? " cronograma__dia--hoy" : ""}`}>
                    <span className="cronograma__dia-nombre">{NOMBRES_DIA[i]}</span>
                    <span className="cronograma__dia-numero">{dia.fecha.getDate()}</span>
                  </div>
                ))}
              </div>

              {hayFilaSuperior && (
                <div className="cronograma__fila cronograma__fila--superior">
                  <span className="cronograma__etiqueta-fila">Todo el día</span>
                  {dias.map((dia) => (
                    <div key={dia.iso} className="cronograma__celda-superior">
                      {dia.eventosTodoElDia.map((evento) => (
                        <button
                          key={`e${evento.id}`}
                          type="button"
                          className="cronograma__chip cronograma__chip--evento"
                          onClick={() => navigate("/eventos", { state: { fecha: dia.iso } })}
                        >
                          {evento.titulo}
                        </button>
                      ))}
                      {dia.metas.map((meta) => (
                        <span key={`m${meta.idMeta}`} className={`cronograma__chip cronograma__chip--meta${meta.completada ? " cronograma__chip--hecha" : ""}`}>
                          {meta.titulo}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="cronograma__fila cronograma__cuerpo" style={{ height: (horas.length * PX_POR_HORA) }}>
                <div className="cronograma__horas">
                  {horas.map((hora, i) => (
                    <span key={hora} className="cronograma__hora" style={{ top: i * PX_POR_HORA }}>{textoHora(hora)}</span>
                  ))}
                </div>
                {dias.map((dia) => (
                  <div key={dia.iso} className={`cronograma__columna${dia.iso === hoy ? " cronograma__columna--hoy" : ""}`}>
                    {dia.bloques.map((bloque) => (
                      <button
                        key={`${bloque.tipo}${bloque.id}-${bloque.desde}`}
                        type="button"
                        className={`cronograma__bloque cronograma__bloque--${bloque.tipo}${bloque.tono !== undefined ? ` ${claseTono(bloque.tono)}` : ""}`}
                        aria-label={`${bloque.titulo}, ${bloque.detalle}`}
                        onClick={() => abrir(dia, bloque)}
                        style={{
                          top: ((bloque.desde - desde) / 60) * PX_POR_HORA + 2,
                          height: Math.max(((bloque.hasta - bloque.desde) / 60) * PX_POR_HORA - 4, 22),
                          left: `calc(${(bloque.columna / bloque.columnas) * 100}% + 3px)`,
                          width: `calc(${100 / bloque.columnas}% - 6px)`,
                        }}
                      >
                        <span className="cronograma__bloque-titulo">{bloque.titulo}</span>
                        <span className="cronograma__bloque-detalle">{bloque.detalle}</span>
                      </button>
                    ))}
                    {dia.iso === hoy && minutoActual >= desde && minutoActual <= hasta && (
                      <span
                        className="cronograma__ahora"
                        aria-hidden="true"
                        style={{ top: ((minutoActual - desde) / 60) * PX_POR_HORA }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PlantillaLayout>
  );
}