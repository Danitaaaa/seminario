import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { CartelError } from "../../components/comunes/cartelError";
import { mesDe, type Meta } from "../../types/metas";
import type { Evento } from "../../types/eventos";
import type { HorarioCursado } from "../../types/horarios";
import type { AporteIntegrante, ResumenMaterial, ResumenProyecto, ResumenSesiones } from "../../types/estadisticas";
import "../../styles/estadisticas.css";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CANTIDAD_MESES = 6;

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

const dosCifras = (n: number) => String(n).padStart(2, "0");
const diaDe = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const nombreMes = (mes: string) => `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`;
const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// Los últimos meses (AAAA-MM), del más viejo al actual.
function ultimosMeses(cantidad: number, hoy: Date): string[] {
  return Array.from({ length: cantidad }, (_, i) => mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - i), 1)));
}

// 95 -> "1 h 35 min", 40 -> "40 min"
function textoMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// 185000000 -> "176,4 MB"
function textoBytes(bytes: number): string {
  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toLocaleString("es-AR", { maximumFractionDigits: i === 0 ? 0 : 1 })} ${unidades[i]}`;
}

// Una fila de barra horizontal: nombre, barra proporcional al máximo y el valor.
interface FilaBarra {
  clave: string;
  nombre: string;
  valor: number;
  texto: string;
}

// Reportes del usuario: material, metas, eventos, clases, sesiones de estudio y proyectos.
export function EstadisticasPage() {
  const usuarioId = obtenerUsuarioId();
  const [hoy] = useState(() => new Date());
  const [material, setMaterial] = useState<ResumenMaterial | null>(null);
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [horarios, setHorarios] = useState<HorarioCursado[] | null>(null);
  const [sesiones, setSesiones] = useState<ResumenSesiones | null>(null);
  const [proyectos, setProyectos] = useState<ResumenProyecto[] | null>(null);
  const [error, setError] = useState("");

  const meses = ultimosMeses(CANTIDAD_MESES, hoy);
  const mesActual = mesDe(hoy);

  useEffect(() => {
    if (!usuarioId) return;
    const fallo = (e: unknown) => setError(mensajeDe(e));
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    window.api.resumenMaterial({ idUsuario: usuarioId }).then(setMaterial).catch(fallo);
    window.api.listarMetas({ idUsuario: usuarioId, mes: mesActual }).then(setMetas).catch(fallo);
    window.api.listarEventos({ usuarioId, desde: inicioMes.toISOString(), hasta: finMes.toISOString() }).then(setEventos).catch(fallo);
    window.api.listarHorarios({ usuarioId }).then(setHorarios).catch(fallo);
    // Sesiones y proyectos se cuentan desde el mismo día, con la hora de la compu.
    // getTimezoneOffset da UTC - local (Argentina: 180); el main necesita local - UTC.
    const periodo = { idUsuario: usuarioId, desde: `${meses[0]}-01`, desfaseMinutos: -hoy.getTimezoneOffset() };
    window.api.resumenSesionesEstudio(periodo).then(setSesiones).catch(fallo);
    window.api.resumenProyectos({ ...periodo, mes: mesActual, hoy: diaDe(hoy) }).then(setProyectos).catch(fallo);
  }, [usuarioId]);

  // ---- Metas personales del mes ----
  const hoyISO = diaDe(hoy);
  const cumplidas = metas?.filter((m) => m.completada).length ?? 0;
  const pendientes = (metas?.length ?? 0) - cumplidas;
  const conFechaPasada = metas?.filter((m) => !m.completada && m.fechaLimite !== null && m.fechaLimite < hoyISO).length ?? 0;

  // ---- Eventos del mes ----
  const enUnaSemana = new Date(hoy.getTime() + 7 * 86_400_000);
  const proximos = eventos?.filter((e) => new Date(e.fecha) >= hoy && new Date(e.fecha) <= enUnaSemana).length ?? 0;
  const porCategoria = agrupar(eventos ?? [], (e) => e.categoria || "Sin categoría");

  // ---- Clases: horas por semana de cada materia ----
  const minutosPorMateria = new Map<string, number>();
  for (const h of horarios ?? []) {
    const minutos = Math.max(0, aMinutos(h.horaFin) - aMinutos(h.horaInicio));
    minutosPorMateria.set(h.titulo, (minutosPorMateria.get(h.titulo) ?? 0) + minutos);
  }
  const minutosClase = [...minutosPorMateria.values()].reduce((n, m) => n + m, 0);
  const clases: FilaBarra[] = [...minutosPorMateria]
    .sort((a, b) => b[1] - a[1])
    .map(([materia, minutos]) => ({ clave: materia, nombre: materia, valor: minutos, texto: textoMinutos(minutos) }));

  return (
    <PlantillaLayout titulo="Estadísticas" idActivo="estadisticas" usuario={{ nombre: "Usuario" }}>
      <div className="estadisticas">
        {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}

        <div className="estadisticas__kpis">
          <Kpi
            valor={material ? String(material.archivos) : "—"}
            etiqueta="archivos"
            detalle={material ? `${textoBytes(material.bytes)} en ${material.carpetas} ${material.carpetas === 1 ? "carpeta" : "carpetas"}` : "Cargando…"}
          />
          <Kpi
            valor={metas?.length ? `${porcentaje(cumplidas, metas.length)}%` : "—"}
            etiqueta="metas cumplidas"
            detalle={metas ? `${cumplidas} de ${metas.length} este mes` : "Cargando…"}
          />
          <Kpi
            valor={eventos ? String(eventos.length) : "—"}
            etiqueta={`eventos en ${MESES[hoy.getMonth()]}`}
            detalle={eventos ? `${proximos} en los próximos 7 días` : "Cargando…"}
          />
          <Kpi
            valor={horarios ? textoMinutos(minutosClase) : "—"}
            etiqueta="de clase por semana"
            detalle={horarios ? `${minutosPorMateria.size} ${minutosPorMateria.size === 1 ? "materia" : "materias"}` : "Cargando…"}
          />
        </div>

        <div className="estadisticas__grilla">
          <Tarjeta titulo="Metas del mes">
            {metas === null ? <Cargando /> : metas.length === 0 ? (
              <Vacio>Todavía no anotaste metas este mes. Las del inicio aparecen acá.</Vacio>
            ) : (
              <div className="dona-metas">
                <Dona parte={cumplidas} total={metas.length} />
                <ul className="dona-metas__leyenda">
                  <li><span className="punto punto--cumplida" /> {cumplidas} {cumplidas === 1 ? "cumplida" : "cumplidas"}</li>
                  <li><span className="punto punto--pendiente" /> {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}</li>
                  {conFechaPasada > 0 && (
                    <li className="dona-metas__alerta">
                      <AlertTriangle size={14} aria-hidden="true" /> {conFechaPasada} con la fecha pasada
                    </li>
                  )}
                </ul>
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo={`Eventos de ${MESES[hoy.getMonth()]} por categoría`}>
            {eventos === null ? <Cargando /> : porCategoria.length === 0 ? (
              <Vacio>No tenés eventos este mes.</Vacio>
            ) : (
              <Barras filas={porCategoria.map(([nombre, cantidad]) => ({ clave: nombre, nombre, valor: cantidad, texto: String(cantidad) }))} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Horas de clase por materia">
            {horarios === null ? <Cargando /> : clases.length === 0 ? (
              <Vacio>Cargá tus horarios de cursado para ver cuántas horas tenés de cada materia.</Vacio>
            ) : (
              <Barras filas={clases} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Sesiones de estudio" ancha nota={`Últimos ${CANTIDAD_MESES} meses`}>
            {sesiones === null ? <Cargando /> : <SeccionSesiones resumen={sesiones} meses={meses} mesActual={mesActual} />}
          </Tarjeta>

          <Tarjeta titulo="Proyectos" ancha nota={`Últimos ${CANTIDAD_MESES} meses`}>
            {proyectos === null ? <Cargando /> : proyectos.length === 0 ? (
              <Vacio>No estás en ningún proyecto todavía. <Link to="/proyectos">Creá uno</Link> o pedí que te inviten.</Vacio>
            ) : (
              <SeccionProyectos proyectos={proyectos} meses={meses} mesActual={mesActual} />
            )}
          </Tarjeta>
        </div>
      </div>
    </PlantillaLayout>
  );
}

// Cuenta cuántos elementos hay de cada grupo, de mayor a menor.
function agrupar<T>(lista: T[], clave: (item: T) => string): [string, number][] {
  const cuentas = new Map<string, number>();
  for (const item of lista) cuentas.set(clave(item), (cuentas.get(clave(item)) ?? 0) + 1);
  return [...cuentas].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function Kpi({ valor, etiqueta, detalle }: { valor: string; etiqueta: string; detalle: string }) {
  return (
    <div className="estadisticas__kpi">
      <strong className="estadisticas__kpi-valor">{valor}</strong>
      <span className="estadisticas__kpi-etiqueta">{etiqueta}</span>
      <span className="estadisticas__kpi-detalle">{detalle}</span>
    </div>
  );
}

function Tarjeta({ titulo, nota, ancha, children }: { titulo: string; nota?: string; ancha?: boolean; children: ReactNode }) {
  return (
    <section className={`estadisticas__tarjeta${ancha ? " estadisticas__tarjeta--ancha" : ""}`}>
      <header className="estadisticas__tarjeta-cabecera">
        <h2 className="estadisticas__tarjeta-titulo">{titulo}</h2>
        {nota && <span className="estadisticas__nota">{nota}</span>}
      </header>
      {children}
    </section>
  );
}

const Cargando = () => <p className="estadisticas__vacio" role="status">Cargando…</p>;
const Vacio = ({ children }: { children: ReactNode }) => <p className="estadisticas__vacio">{children}</p>;

// Anillo con el % cumplido en el centro.
function Dona({ parte, total }: { parte: number; total: number }) {
  const radio = 42;
  const vuelta = 2 * Math.PI * radio;
  const valor = porcentaje(parte, total);
  return (
    <svg className="dona" viewBox="0 0 100 100" role="img" aria-label={`${valor}% de las metas cumplidas`}>
      <circle className="dona__fondo" cx="50" cy="50" r={radio} />
      <circle
        className="dona__valor"
        cx="50"
        cy="50"
        r={radio}
        strokeDasharray={`${(vuelta * valor) / 100} ${vuelta}`}
        transform="rotate(-90 50 50)"
      />
      <text className="dona__texto" x="50" y="50" textAnchor="middle" dominantBaseline="central">{valor}%</text>
    </svg>
  );
}

// Barras horizontales: el largo es proporcional al valor más alto.
function Barras({ filas }: { filas: FilaBarra[] }) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="barras">
      {filas.map((f) => (
        <li key={f.clave} className="barras__fila" title={`${f.nombre}: ${f.texto}`}>
          <span className="barras__nombre">{f.nombre}</span>
          <span className="barras__pista" aria-hidden="true">
            <span className="barras__relleno" style={{ width: `${(f.valor / maximo) * 100}%` }} />
          </span>
          <span className="barras__valor">{f.texto}</span>
        </li>
      ))}
    </ul>
  );
}

// Una barra del gráfico mensual: null = el mes no tiene datos.
interface BarraMes {
  mes: string;
  valor: number | null;
}

// Barras verticales por mes. El mes actual va resaltado; al pasar el mouse se ve el detalle.
function GraficoMeses({ titulo, barras, tope, actual, texto, guia, sinDatos }: {
  titulo: string;
  barras: BarraMes[];
  tope: number;
  actual: string;
  texto: (valor: number) => string;
  guia: (valor: number) => string;
  sinDatos: string;
}) {
  const [activo, setActivo] = useState<string | null>(null);

  return (
    <figure className="grafico">
      <figcaption className="grafico__titulo">{titulo}</figcaption>
      <div className="grafico__area">
        {[100, 50, 0].map((pos) => (
          <span key={pos} className="grafico__guia" style={{ bottom: `${pos}%` }}>
            <span className="grafico__guia-texto">{pos === 0 ? "0" : guia((tope * pos) / 100)}</span>
          </span>
        ))}
        <ol className="grafico__barras" style={{ gridTemplateColumns: `repeat(${barras.length}, 1fr)` }}>
          {barras.map((b) => {
            const detalle = `${nombreMes(b.mes)}: ${b.valor === null ? sinDatos : texto(b.valor)}`;
            const altura = b.valor === null ? 0 : (b.valor / tope) * 100;
            const mostrar = activo === b.mes || (activo === null && b.mes === actual && b.valor !== null);
            return (
              <li
                key={b.mes}
                className="grafico__columna"
                tabIndex={0}
                aria-label={detalle}
                onMouseEnter={() => setActivo(b.mes)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(b.mes)}
                onBlur={() => setActivo(null)}
              >
                {mostrar && (
                  <span className="grafico__valor" style={{ bottom: `calc(${altura}% + 6px)` }}>
                    {activo === b.mes ? detalle : texto(b.valor ?? 0)}
                  </span>
                )}
                {b.valor === null ? (
                  <span className="grafico__sin-dato" aria-hidden="true">—</span>
                ) : (
                  <span className={`grafico__barra${b.mes === actual ? " grafico__barra--actual" : ""}`} style={{ height: `${Math.max(altura, 2)}%` }} />
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <ol className="grafico__ejes" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${barras.length}, 1fr)` }}>
        {barras.map((b) => <li key={b.mes}>{nombreMes(b.mes)}</li>)}
      </ol>
    </figure>
  );
}

function SeccionSesiones({ resumen, meses, mesActual }: { resumen: ResumenSesiones; meses: string[]; mesActual: string }) {
  const { sesiones, minutos, objetivos, porMes, porMateria } = resumen;
  const vencidas = sesiones.completadas + sesiones.atrasadas;

  if (vencidas === 0 && minutos.estudiados === 0) {
    return (
      <Vacio>
        Todavía no terminaste sesiones en estos meses. <Link to="/sesiones">Planificá una sesión</Link> y acá vas a ver cuánto estudiaste.
      </Vacio>
    );
  }

  // La escala se redondea a horas enteras para que las guías sean claras.
  const tope = Math.ceil(Math.max(60, ...porMes.map((m) => m.minutos)) / 60) * 60;

  return (
    <div className="sesiones-resumen">
      <div className="sesiones-resumen__numeros">
        <Numero valor={textoMinutos(minutos.estudiados)} etiqueta="estudiados" detalle={minutos.planificados ? `${porcentaje(minutos.estudiados, minutos.planificados)}% de lo planificado` : ""} />
        <Numero valor={`${sesiones.completadas} de ${vencidas}`} etiqueta="sesiones cumplidas" detalle={sesiones.atrasadas ? `${sesiones.atrasadas} quedaron atrasadas` : "Ninguna atrasada"} />
        <Numero valor={`${objetivos.completados} de ${objetivos.total}`} etiqueta="objetivos tildados" detalle={objetivos.total ? `${porcentaje(objetivos.completados, objetivos.total)}%` : "Sin objetivos"} />
      </div>
      <div className="sesiones-resumen__graficos">
        <GraficoMeses
          titulo="Tiempo estudiado por mes"
          tope={tope}
          actual={mesActual}
          texto={textoMinutos}
          guia={(minutos) => `${minutos / 60} h`}
          sinDatos="sin sesiones terminadas"
          barras={meses.map((mes) => ({ mes, valor: porMes.find((m) => m.mes === mes)?.minutos ?? null }))}
        />
        {porMateria.length > 0 && (
          <div>
            <p className="grafico__titulo">Tiempo por materia</p>
            <Barras filas={porMateria.map((m) => ({ clave: m.materia, nombre: m.materia, valor: m.minutos, texto: textoMinutos(m.minutos) }))} />
          </div>
        )}
      </div>
    </div>
  );
}

function Numero({ valor, etiqueta, detalle }: { valor: string; etiqueta: string; detalle: string }) {
  return (
    <div className="estadisticas__numero">
      <strong>{valor}</strong>
      <span>{etiqueta}</span>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

// Proyectos con el mismo formato que las sesiones: números, tareas completadas por mes y aporte de cada integrante.
// Se puede ver un proyecto o todos juntos.
function SeccionProyectos({ proyectos, meses, mesActual }: { proyectos: ResumenProyecto[]; meses: string[]; mesActual: string }) {
  const [elegido, setElegido] = useState<number | null>(null);
  const visibles = elegido === null ? proyectos : proyectos.filter((p) => p.idProyecto === elegido);
  const sumar = (valor: (p: ResumenProyecto) => number) => visibles.reduce((n, p) => n + valor(p), 0);

  const total = sumar((p) => p.tareas.total);
  const hechas = sumar((p) => p.tareas.hechas);
  const pendientes = sumar((p) => p.tareas.pendientes);
  const vencidas = sumar((p) => p.tareas.vencidas);
  const sinAsignar = sumar((p) => p.tareas.sinAsignar);
  const metasTotal = sumar((p) => p.metasMes.total);
  const metasCumplidas = sumar((p) => p.metasMes.completadas);
  const avisos = [vencidas && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`, sinAsignar && `${sinAsignar} sin asignar`].filter(Boolean);

  // Con todos los proyectos, el aporte de cada persona se suma entre proyectos.
  const aportes = new Map<number, AporteIntegrante>();
  for (const p of visibles) {
    for (const i of p.integrantes) {
      const previo = aportes.get(i.idUsuario);
      aportes.set(i.idUsuario, previo ? { ...previo, hechas: previo.hechas + i.hechas, pendientes: previo.pendientes + i.pendientes } : { ...i });
    }
  }
  const integrantes = [...aportes.values()]
    .filter((i) => i.hechas + i.pendientes > 0)
    .sort((a, b) => b.hechas - a.hechas || a.nombre.localeCompare(b.nombre));
  const maximo = Math.max(1, ...integrantes.map((i) => i.hechas + i.pendientes));

  const barras: BarraMes[] = meses.map((mes) => {
    const cantidad = visibles.reduce((n, p) => n + (p.porMes.find((m) => m.mes === mes)?.hechas ?? 0), 0);
    return { mes, valor: cantidad || null };
  });
  // Escala par para que la guía del medio sea un número entero.
  const tope = Math.max(2, Math.ceil(Math.max(...barras.map((b) => b.valor ?? 0)) / 2) * 2);
  const tareas = (n: number) => `${n} ${n === 1 ? "tarea" : "tareas"}`;

  return (
    <div className="sesiones-resumen">
      {proyectos.length > 1 && (
        <div className="estadisticas__filtros" role="group" aria-label="Proyecto">
          <button type="button" className="estadisticas__filtro" aria-pressed={elegido === null} onClick={() => setElegido(null)}>
            Todos
          </button>
          {proyectos.map((p) => (
            <button
              key={p.idProyecto}
              type="button"
              className="estadisticas__filtro"
              aria-pressed={elegido === p.idProyecto}
              onClick={() => setElegido(p.idProyecto)}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="sesiones-resumen__numeros">
        <Numero valor={`${hechas} de ${total}`} etiqueta="tareas hechas" detalle={total ? `${porcentaje(hechas, total)}% del total` : "Todavía no hay tareas"} />
        <Numero valor={String(pendientes)} etiqueta={pendientes === 1 ? "tarea pendiente" : "tareas pendientes"} detalle={avisos.length ? avisos.join(" · ") : "Ninguna vencida"} />
        <Numero valor={`${metasCumplidas} de ${metasTotal}`} etiqueta="metas del mes" detalle={metasTotal ? `${porcentaje(metasCumplidas, metasTotal)}% cumplidas` : "Sin metas este mes"} />
      </div>

      <div className="sesiones-resumen__graficos">
        <GraficoMeses
          titulo="Tareas completadas por mes"
          tope={tope}
          actual={mesActual}
          texto={tareas}
          guia={String}
          sinDatos="ninguna completada"
          barras={barras}
        />
        <div className="proyectos-resumen__lado">
          {elegido === null && proyectos.length > 1 && (
            <div>
              <p className="grafico__titulo">Avance de cada proyecto</p>
              <Barras
                filas={proyectos.map((p) => ({
                  clave: String(p.idProyecto),
                  nombre: p.nombre,
                  valor: porcentaje(p.tareas.hechas, p.tareas.total),
                  texto: p.tareas.total ? `${porcentaje(p.tareas.hechas, p.tareas.total)}%` : "—",
                }))}
              />
            </div>
          )}
          {integrantes.length > 0 && (
            <div className="aporte">
              <div className="aporte__cabecera">
                <span className="grafico__titulo">Aporte de cada integrante</span>
                <span className="aporte__leyenda">
                  <span className="aporte__muestra aporte__muestra--hechas" /> Hechas
                  <span className="aporte__muestra aporte__muestra--pendientes" /> Pendientes
                </span>
              </div>
              <ul className="aporte__lista">
                {integrantes.map((i) => (
                  <li key={i.idUsuario} className="aporte__fila" title={`${i.nombre}: ${i.hechas} hechas, ${i.pendientes} pendientes`}>
                    <span className="aporte__nombre">{i.nombre}</span>
                    <span className="aporte__pista" aria-hidden="true">
                      {i.hechas > 0 && <span className="aporte__hechas" style={{ width: `${(i.hechas / maximo) * 100}%` }} />}
                      {i.pendientes > 0 && <span className="aporte__pendientes" style={{ width: `${(i.pendientes / maximo) * 100}%` }} />}
                    </span>
                    <span className="aporte__numero">{i.hechas}/{i.hechas + i.pendientes}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {elegido !== null && (
            <Link className="estadisticas__enlace" to={`/proyectos/${elegido}/tareas`}>Abrir la división de tareas →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
