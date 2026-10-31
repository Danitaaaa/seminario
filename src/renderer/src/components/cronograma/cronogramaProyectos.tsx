import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Evento } from "../../types/eventos";
import type { Miembro, Proyecto } from "../../types/proyectos";
import type { ColorMiembro, Tarea } from "../../types/tareas";
import { armarColumnas, COLOR_SIN_ASIGNAR, iniciales, primerNombre } from "../../utils/tablero";
import { fechaISO, inicioDeSemana, sumarDias } from "../../utils/cronograma";

const SEMANAS = 4;
const DIAS = SEMANAS * 7;
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const SIN_ASIGNAR: ColorMiembro = { fondo: COLOR_SIN_ASIGNAR, texto: "#1E1E1E" };

interface DatosProyecto {
  proyecto: Proyecto;
  miembros: Miembro[];
  tareas: Tarea[];
  // Color de cada integrante, el mismo que en la División de tareas.
  colores: Map<number, ColorMiembro>;
}

interface Props {
  idUsuario: number;
  // Los eventos ya cargados del cronograma: los de proyectos se muestran como hitos.
  eventos: Evento[];
}

// AAAA-MM-DD a Date local (sin corrimiento de zona horaria).
const aFecha = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
};
const textoCorto = (iso: string) => {
  const f = aFecha(iso);
  return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
};
const diasEntre = (desde: Date, hasta: Date) => Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);

// Una tarea va desde que empieza (o desde que se creó) hasta su fecha límite.
function rangoTarea(tarea: Tarea): { desde: string; hasta: string } {
  const desde = tarea.fechaInicio ?? fechaISO(new Date(tarea.fechaCreacion));
  const hasta = tarea.fechaLimite && tarea.fechaLimite >= desde ? tarea.fechaLimite : desde;
  return { desde, hasta };
}

// Cronograma de proyectos: las tareas de cada proyecto como barras, con el color de quien la tiene asignada.
export function CronogramaProyectos({ idUsuario, eventos }: Props) {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<DatosProyecto[] | null>(null);
  const [elegido, setElegido] = useState<number | "todos">("todos");
  const [resaltado, setResaltado] = useState<number | null>(null);
  const [inicio, setInicio] = useState(() => sumarDias(inicioDeSemana(new Date()), -7));
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const proyectos = await window.api.listarProyectos({ idUsuario });
        const cargados = await Promise.all(
          proyectos.map(async (proyecto) => {
            const [miembros, tareas] = await Promise.all([
              window.api.listarMiembros({ idProyecto: proyecto.idProyecto, idUsuarioSolicitante: idUsuario }),
              window.api.listarTareas({ idProyecto: proyecto.idProyecto, idUsuario }),
            ]);
            const colores = new Map(armarColumnas(miembros, idUsuario).map((c) => [c.idUsuario, c.color]));
            return { proyecto, miembros, tareas, colores };
          })
        );
        if (activo) setDatos(cargados);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : "No se pudieron cargar los proyectos.");
      }
    })();
    return () => {
      activo = false;
    };
  }, [idUsuario]);

  if (error) return <p className="cronograma__error">{error}</p>;
  if (datos === null) return <p className="cronograma__aviso" role="status">Cargando proyectos…</p>;
  if (datos.length === 0) {
    return <p className="cronograma__aviso">Todavía no estás en ningún proyecto. Cuando tengas tareas con fechas, aparecen acá.</p>;
  }

  const visibles = elegido === "todos" ? datos : datos.filter((d) => d.proyecto.idProyecto === elegido);
  const fin = sumarDias(inicio, DIAS - 1);
  const desdeISO = fechaISO(inicio);
  const hastaISO = fechaISO(fin);
  const hoy = fechaISO(new Date());
  const columnaHoy = diasEntre(inicio, aFecha(hoy));

  // Integrantes de los proyectos que se ven, con su color (si está en varios, el del primero).
  const integrantes = new Map<number, { nombre: string; color: ColorMiembro }>();
  for (const d of visibles) {
    for (const m of d.miembros) {
      if (m.idUsuario === null || integrantes.has(m.idUsuario)) continue;
      const color = d.colores.get(m.idUsuario);
      if (color) integrantes.set(m.idUsuario, { nombre: m.nombre, color });
    }
  }

  // Tareas que caen en las semanas que se ven, ordenadas por cuándo empiezan.
  const filas = visibles
    .flatMap((d) =>
      d.tareas.map((tarea) => {
        const rango = rangoTarea(tarea);
        const asignado = tarea.idAsignadoGlobal === null ? null : d.miembros.find((m) => m.idUsuario === tarea.idAsignadoGlobal);
        const color = (tarea.idAsignadoGlobal !== null && d.colores.get(tarea.idAsignadoGlobal)) || SIN_ASIGNAR;
        return { tarea, proyecto: d.proyecto, rango, asignado, color };
      })
    )
    .filter((f) => f.rango.hasta >= desdeISO && f.rango.desde <= hastaISO)
    .sort((a, b) => a.rango.desde.localeCompare(b.rango.desde) || a.rango.hasta.localeCompare(b.rango.hasta));

  // Hitos: los eventos de los proyectos y el día en que termina cada proyecto.
  const idsVisibles = new Set(visibles.map((d) => d.proyecto.idProyecto));
  const hitos = [
    ...eventos
      .filter((e) => e.idProyecto !== null && idsVisibles.has(e.idProyecto))
      .map((e) => ({ clave: `e${e.id}`, titulo: e.titulo, fecha: fechaISO(new Date(e.fecha)), detalle: e.nombreProyecto ?? "" })),
    ...visibles
      .filter((d) => d.proyecto.fechaFin)
      .map((d) => ({ clave: `f${d.proyecto.idProyecto}`, titulo: "Entrega final", fecha: fechaISO(new Date(d.proyecto.fechaFin!)), detalle: d.proyecto.nombre })),
  ].filter((h) => h.fecha >= desdeISO && h.fecha <= hastaISO);

  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(inicio, i));
  const columna = (iso: string) => Math.min(Math.max(diasEntre(inicio, aFecha(iso)), 0), DIAS - 1);

  return (
    <div className="gantt">
      <div className="gantt__barra-superior">
        <div className="gantt__proyectos" role="radiogroup" aria-label="Proyecto">
          {datos.map((d) => (
            <button
              key={d.proyecto.idProyecto}
              type="button"
              role="radio"
              aria-checked={elegido === d.proyecto.idProyecto}
              className={`gantt__chip${elegido === d.proyecto.idProyecto ? " gantt__chip--activo" : ""}`}
              onClick={() => setElegido(d.proyecto.idProyecto)}
            >
              {d.proyecto.nombre}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={elegido === "todos"}
            className={`gantt__chip${elegido === "todos" ? " gantt__chip--activo" : ""}`}
            onClick={() => setElegido("todos")}
          >
            Todos mis proyectos
          </button>
        </div>
        <div className="gantt__navegacion">
          <button type="button" className="app-boton-icono" aria-label="Semana anterior" onClick={() => setInicio(sumarDias(inicio, -7))}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="cronograma__hoy" onClick={() => setInicio(sumarDias(inicioDeSemana(new Date()), -7))}>
            Hoy
          </button>
          <button type="button" className="app-boton-icono" aria-label="Semana siguiente" onClick={() => setInicio(sumarDias(inicio, 7))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {integrantes.size > 0 && (
        <div className="gantt__integrantes">
          <span className="gantt__integrantes-texto">Integrantes (tocá para resaltar):</span>
          {[...integrantes].map(([id, { nombre, color }]) => (
            <button
              key={id}
              type="button"
              aria-pressed={resaltado === id}
              className={`gantt__integrante${resaltado === id ? " gantt__integrante--activo" : ""}`}
              onClick={() => setResaltado(resaltado === id ? null : id)}
            >
              <span className="gantt__avatar" style={{ background: color.fondo, color: color.texto }}>{iniciales(nombre)}</span>
              {primerNombre(nombre)}
            </button>
          ))}
        </div>
      )}

      <div className="gantt__tabla" style={{ ["--gantt-dias" as string]: DIAS }}>
        <div className="gantt__fila gantt__fila--semanas" aria-hidden="true">
          <span className="gantt__titulo-columna">Tarea</span>
          {Array.from({ length: SEMANAS }, (_, s) => {
            const lunes = dias[s * 7];
            return (
              <span key={s} className="gantt__semana" style={{ gridColumn: `${2 + s * 7} / span 7` }}>
                Semana del {lunes.getDate()} {MESES_CORTOS[lunes.getMonth()]}
              </span>
            );
          })}
        </div>
        <div className="gantt__fila gantt__fila--dias" aria-hidden="true">
          <span />
          {dias.map((d) => (
            <span key={fechaISO(d)} className={`gantt__dia${fechaISO(d) === hoy ? " gantt__dia--hoy" : ""}`}>{d.getDate()}</span>
          ))}
        </div>

        {filas.length === 0 && hitos.length === 0 ? (
          <p className="gantt__vacio">No hay tareas con fechas en estas semanas.</p>
        ) : (
          <>
            {filas.map(({ tarea, proyecto, rango, asignado, color }) => {
              const apagada = resaltado !== null && tarea.idAsignadoGlobal !== resaltado;
              const nombre = asignado?.nombre ?? "Sin asignar";
              const etiqueta = asignado ? primerNombre(asignado.nombre) : "Sin asignar";
              return (
                <div key={`${proyecto.idProyecto}-${tarea.idTarea}`} className={`gantt__fila${apagada ? " gantt__fila--apagada" : ""}`}>
                  <button
                    type="button"
                    className="gantt__tarea"
                    onClick={() => navigate(`/proyectos/${proyecto.idProyecto}/tareas`)}
                    title="Abrir la división de tareas"
                  >
                    <span className="gantt__avatar" style={{ background: color.fondo, color: color.texto }}>
                      {asignado ? iniciales(asignado.nombre) : "?"}
                    </span>
                    <span className="gantt__tarea-texto">
                      <span className="gantt__tarea-titulo">{tarea.titulo}</span>
                      <span className="gantt__tarea-detalle">
                        {etiqueta} · {textoCorto(rango.desde)}{rango.hasta !== rango.desde ? ` → ${textoCorto(rango.hasta)}` : ""}
                        {elegido === "todos" ? ` · ${proyecto.nombre}` : ""}
                      </span>
                    </span>
                  </button>
                  <span
                    className={`gantt__bloque${tarea.completada ? " gantt__bloque--hecha" : ""}`}
                    style={{
                      gridColumn: `${2 + columna(rango.desde)} / ${3 + columna(rango.hasta)}`,
                      background: color.fondo,
                      color: color.texto,
                    }}
                    title={`${tarea.titulo}: ${nombre}, ${textoCorto(rango.desde)} → ${textoCorto(rango.hasta)}`}
                  >
                    {tarea.completada && <Check size={12} aria-hidden="true" />}
                    {etiqueta}
                  </span>
                </div>
              );
            })}

            {hitos.map((h) => (
              <div key={h.clave} className="gantt__fila">
                <span className="gantt__tarea gantt__tarea--hito">
                  <span className="gantt__avatar gantt__avatar--hito" aria-hidden="true">◆</span>
                  <span className="gantt__tarea-texto">
                    <span className="gantt__tarea-titulo">{h.titulo}</span>
                    <span className="gantt__tarea-detalle">{h.detalle} · {textoCorto(h.fecha)}</span>
                  </span>
                </span>
                <span className="gantt__hito" style={{ gridColumn: `${2 + columna(h.fecha)}` }} title={`${h.titulo} · ${textoCorto(h.fecha)}`} />
              </div>
            ))}
          </>
        )}

        {columnaHoy >= 0 && columnaHoy < DIAS && (
          <span className="gantt__hoy" style={{ ["--gantt-columna-hoy" as string]: columnaHoy }} aria-hidden="true" />
        )}
      </div>

      <p className="gantt__nota">
        Cada integrante tiene el mismo color que en la División de tareas. Las barras van desde que empieza la tarea
        (o desde que se creó) hasta su fecha límite. La línea es hoy.
      </p>
    </div>
  );
}
