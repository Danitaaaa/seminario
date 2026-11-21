import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { usarPreferencia } from "../../hooks/usarPreferencia";
import { CartelError } from "../../components/comunes/cartelError";
import { mesDe, type Meta } from "../../types/metas";
import type { Evento } from "../../types/eventos";
import type { AporteIntegrante, ResumenCuestionarios, ResumenFlashcards, ResumenProyecto, ResumenSesiones } from "../../types/estadisticas";
import "../../styles/estadisticas.css";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

const dosCifras = (n: number) => String(n).padStart(2, "0");
const diaDe = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
// "2026-11" -> "Nov 26"; "2026-11-14" -> "14/11"
const nombreMes = (clave: string) =>
  clave.length === 10 ? `${clave.slice(8, 10)}/${clave.slice(5, 7)}` : `${MESES_CORTOS[Number(clave.slice(5, 7)) - 1]} ${clave.slice(2, 4)}`;

// Período que se elige arriba: cambia desde cuándo se cuenta y si los gráficos van por día o por mes.
type IdPeriodo = "semana" | "mes" | "4meses" | "6meses";
const PERIODOS: { id: IdPeriodo; nombre: string }[] = [
  { id: "semana", nombre: "Semana" },
  { id: "mes", nombre: "Mes" },
  { id: "4meses", nombre: "4 meses" },
  { id: "6meses", nombre: "6 meses" },
];

interface Periodo {
  claves: string[]; // una por barra: AAAA-MM-DD (por día) o AAAA-MM (por mes), de la más vieja a la actual
  actual: string;
  agrupar: "dia" | "mes";
  unidad: string; // "por día" | "por mes"
  nota: string; // lo que se ve arriba a la derecha de cada tarjeta
}

function armarPeriodo(id: IdPeriodo, hoy: Date): Periodo {
  if (id === "semana" || id === "mes") {
    const dias = id === "semana" ? 7 : 30;
    const claves = Array.from({ length: dias }, (_, i) => diaDe(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1 - i))));
    return { claves, actual: diaDe(hoy), agrupar: "dia", unidad: "por día", nota: id === "semana" ? "Últimos 7 días" : "Últimos 30 días" };
  }
  const cantidad = id === "4meses" ? 4 : 6;
  return { claves: ultimosMeses(cantidad, hoy), actual: mesDe(hoy), agrupar: "mes", unidad: "por mes", nota: `Últimos ${cantidad} meses` };
}

const desdeDe = (p: Periodo) => (p.agrupar === "dia" ? p.claves[0] : `${p.claves[0]}-01`);

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

// Una fila de barra horizontal: nombre, barra proporcional al máximo y el valor.
interface FilaBarra {
  clave: string;
  nombre: string;
  valor: number;
  texto: string;
}

// Reportes del usuario: metas, eventos, sesiones de estudio, flashcards, cuestionarios y proyectos.
export function EstadisticasPage() {
  const usuarioId = obtenerUsuarioId();
  const [hoy] = useState(() => new Date());
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [sesiones, setSesiones] = useState<ResumenSesiones | null>(null);
  const [proyectos, setProyectos] = useState<ResumenProyecto[] | null>(null);
  const [cuestionarios, setCuestionarios] = useState<ResumenCuestionarios | null>(null);
  const [flashcards, setFlashcards] = useState<ResumenFlashcards | null>(null);
  // El período elegido queda guardado al salir de la pantalla.
  const [idPeriodo, setIdPeriodo] = usarPreferencia<IdPeriodo>(`estadisticas:periodo:${obtenerUsuarioId() ?? 0}`, "6meses");
  const [error, setError] = useState("");

  const mesActual = mesDe(hoy);
  const periodo = armarPeriodo(idPeriodo, hoy);

  useEffect(() => {
    if (!usuarioId) return;
    const fallo = (e: unknown) => setError(mensajeDe(e));
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    window.api.listarMetas({ idUsuario: usuarioId, mes: mesActual }).then(setMetas).catch(fallo);
    window.api.listarEventos({ usuarioId, desde: inicioMes.toISOString(), hasta: finMes.toISOString() }).then(setEventos).catch(fallo);
  }, [usuarioId]);

  // Lo que depende del período se vuelve a pedir al cambiarlo.
  useEffect(() => {
    if (!usuarioId) return;
    const fallo = (e: unknown) => setError(mensajeDe(e));
    setSesiones(null);
    setCuestionarios(null);
    setFlashcards(null);
    setProyectos(null);
    // Todo se cuenta desde el mismo día, con la hora de la compu.
    // getTimezoneOffset da UTC - local (Argentina: 180); el main necesita local - UTC.
    const datos = { idUsuario: usuarioId, desde: desdeDe(periodo), desfaseMinutos: -hoy.getTimezoneOffset(), agrupar: periodo.agrupar };
    window.api.resumenSesionesEstudio(datos).then(setSesiones).catch(fallo);
    window.api.resumenCuestionarios(datos).then(setCuestionarios).catch(fallo);
    window.api.resumenFlashcards(datos).then(setFlashcards).catch(fallo);
    window.api.resumenProyectos({ ...datos, mes: mesActual, hoy: diaDe(hoy) }).then(setProyectos).catch(fallo);
  }, [usuarioId, idPeriodo]);

  // ---- Metas personales del mes ----
  const hoyISO = diaDe(hoy);
  const cumplidas = metas?.filter((m) => m.completada).length ?? 0;
  const pendientes = (metas?.length ?? 0) - cumplidas;
  const conFechaPasada = metas?.filter((m) => !m.completada && m.fechaLimite !== null && m.fechaLimite < hoyISO).length ?? 0;

  // ---- Eventos del mes ----
  const enUnaSemana = new Date(hoy.getTime() + 7 * 86_400_000);
  const proximos = eventos?.filter((e) => new Date(e.fecha) >= hoy && new Date(e.fecha) <= enUnaSemana).length ?? 0;
  const porCategoria = agrupar(eventos ?? [], (e) => e.categoria || "Sin categoría");

  // ---- Horas estudiadas por materia (de las sesiones terminadas en el período) ----
  const horasPorMateria: FilaBarra[] = (sesiones?.porMateria ?? []).map((m) => ({
    clave: m.materia,
    nombre: m.materia,
    valor: m.minutos,
    texto: textoMinutos(m.minutos),
  }));

  return (
    <PlantillaLayout titulo="Estadísticas" idActivo="estadisticas" usuario={{ nombre: "Usuario" }}>
      <div className="estadisticas">
        {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}

        <div className="estadisticas__filtros estadisticas__periodo" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className="estadisticas__filtro" aria-pressed={idPeriodo === p.id} onClick={() => setIdPeriodo(p.id)}>
              {p.nombre}
            </button>
          ))}
        </div>

        <div className="estadisticas__kpis">
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

          <Tarjeta titulo="Flashcards" nota={periodo.nota}>
            {flashcards === null ? <Cargando /> : flashcards.repasos === 0 ? (
              <Vacio>No repasaste flashcards en este período. <Link to="/flashcards">Repasá un mazo</Link>.</Vacio>
            ) : (
              <div className="dona-metas">
                <Dona parte={flashcards.faciles} total={flashcards.repasos} etiqueta="de las tarjetas te salieron fáciles" />
                <ul className="dona-metas__leyenda">
                  <li><span className="punto punto--cumplida" /> {flashcards.faciles} {flashcards.faciles === 1 ? "fácil" : "fáciles"}</li>
                  <li><span className="punto punto--pendiente" /> {flashcards.repasos - flashcards.faciles} intermedias o difíciles</li>
                  <li>{flashcards.repasos} {flashcards.repasos === 1 ? "repaso" : "repasos"} · {flashcards.mazos} {flashcards.mazos === 1 ? "mazo" : "mazos"}</li>
                </ul>
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo="Cuestionarios con IA" nota={periodo.nota}>
            {cuestionarios === null ? <Cargando /> : cuestionarios.intentos === 0 ? (
              <Vacio>No resolviste cuestionarios en este período. <Link to="/cuestionarios">Generá uno con IA</Link>.</Vacio>
            ) : (
              <TarjetaCuestionarios resumen={cuestionarios} />
            )}
          </Tarjeta>

          <Tarjeta titulo={`Eventos de ${MESES[hoy.getMonth()]} por categoría`}>
            {eventos === null ? <Cargando /> : porCategoria.length === 0 ? (
              <Vacio>No tenés eventos este mes.</Vacio>
            ) : (
              <Barras filas={porCategoria.map(([nombre, cantidad]) => ({ clave: nombre, nombre, valor: cantidad, texto: String(cantidad) }))} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Horas estudiadas por materia" nota={periodo.nota}>
            {sesiones === null ? <Cargando /> : horasPorMateria.length === 0 ? (
              <Vacio>Cuando termines sesiones de estudio con materia, acá vas a ver cuántas horas le dedicaste a cada una.</Vacio>
            ) : (
              <Barras filas={horasPorMateria} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Sesiones de estudio" ancha nota={periodo.nota}>
            {sesiones === null ? <Cargando /> : <SeccionSesiones resumen={sesiones} periodo={periodo} />}
          </Tarjeta>

          <Tarjeta titulo="Proyectos" ancha nota={periodo.nota}>
            {proyectos === null ? <Cargando /> : proyectos.length === 0 ? (
              <Vacio>No estás en ningún proyecto todavía. <Link to="/proyectos">Creá uno</Link> o pedí que te inviten.</Vacio>
            ) : (
              <SeccionProyectos proyectos={proyectos} periodo={periodo} />
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
function Dona({ parte, total, etiqueta = "de las metas cumplidas" }: { parte: number; total: number; etiqueta?: string }) {
  const radio = 42;
  const vuelta = 2 * Math.PI * radio;
  const valor = porcentaje(parte, total);
  return (
    <svg className="dona" viewBox="0 0 100 100" role="img" aria-label={`${valor}% ${etiqueta}`}>
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

// Barras horizontales: el largo es proporcional al valor más alto (o a `tope`, por ejemplo 100 para porcentajes).
function Barras({ filas, tope }: { filas: FilaBarra[]; tope?: number }) {
  const maximo = tope ?? Math.max(1, ...filas.map((f) => f.valor));
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
        {/* Con muchas barras (30 días) se muestra una etiqueta cada tanto para que no se encimen. */}
        {barras.map((b, i) => <li key={b.mes}>{i % Math.ceil(barras.length / 10) === 0 || b.mes === actual ? nombreMes(b.mes) : ""}</li>)}
      </ol>
    </figure>
  );
}

function SeccionSesiones({ resumen, periodo }: { resumen: ResumenSesiones; periodo: Periodo }) {
  const { sesiones, minutos, objetivos, porMes } = resumen;
  const vencidas = sesiones.completadas + sesiones.atrasadas;

  if (vencidas === 0 && minutos.estudiados === 0) {
    return (
      <Vacio>
        Todavía no terminaste sesiones en este período. <Link to="/sesiones">Planificá una sesión</Link> y acá vas a ver cuánto estudiaste.
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
          titulo={`Tiempo estudiado ${periodo.unidad}`}
          tope={tope}
          actual={periodo.actual}
          texto={textoMinutos}
          guia={(minutos) => `${minutos / 60} h`}
          sinDatos="sin sesiones terminadas"
          barras={periodo.claves.map((mes) => ({ mes, valor: porMes.find((m) => m.mes === mes)?.minutos ?? null }))}
        />
      </div>
    </div>
  );
}

// Cuestionarios como "Metas del mes": el % de respuestas correctas y, al tocar, los temas para reforzar.
function TarjetaCuestionarios({ resumen }: { resumen: ResumenCuestionarios }) {
  const [verTemas, setVerTemas] = useState(false);
  const { intentos, correctas, preguntas, temas } = resumen;
  return (
    <>
      <div className="dona-metas">
        <Dona parte={correctas} total={preguntas} etiqueta="de respuestas correctas" />
        <ul className="dona-metas__leyenda">
          <li><span className="punto punto--cumplida" /> {correctas} {correctas === 1 ? "correcta" : "correctas"}</li>
          <li><span className="punto punto--pendiente" /> {preguntas - correctas} {preguntas - correctas === 1 ? "incorrecta" : "incorrectas"}</li>
          <li>{intentos} {intentos === 1 ? "cuestionario resuelto" : "cuestionarios resueltos"}</li>
        </ul>
      </div>
      {temas.length > 0 && (
        <>
          <button type="button" className="estadisticas__desplegar" aria-expanded={verTemas} onClick={() => setVerTemas((v) => !v)}>
            {verTemas ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Temas para reforzar ({temas.length})
          </button>
          {verTemas && <Barras filas={temas.map((t) => ({ clave: t.tema, nombre: t.tema, valor: t.errores, texto: `${t.errores} de ${t.total} mal` }))} />}
        </>
      )}
    </>
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
function SeccionProyectos({ proyectos, periodo }: { proyectos: ResumenProyecto[]; periodo: Periodo }) {
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

  const barras: BarraMes[] = periodo.claves.map((mes) => {
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
          titulo={`Tareas completadas ${periodo.unidad}`}
          tope={tope}
          actual={periodo.actual}
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
