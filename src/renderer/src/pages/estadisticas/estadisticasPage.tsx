import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FolderKanban, Target, Timer, UserX } from "lucide-react";
import { Link } from "react-router-dom";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { CartelError } from "../../components/comunes/cartelError";
import { mesDe, type EstadisticasMetas } from "../../types/metas";
import type { ResumenProyecto, ResumenSesiones } from "../../types/estadisticas";
import "../../styles/estadisticas.css";

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

// Los últimos meses (AAAA-MM), del más viejo al actual.
function ultimosMeses(cantidad: number, hoy: Date): string[] {
  return Array.from({ length: cantidad }, (_, i) => mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - i), 1)));
}

const nombreMes = (mes: string) => `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`;

// 95 -> "1 h 35 min", 40 -> "40 min"
function textoMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// Una barra del gráfico: altura en % del alto del gráfico y los textos que la describen.
interface Barra {
  clave: string;
  etiqueta: string;
  altura: number | null; // null = sin datos ese mes
  valor: string;
  detalle: string;
}

interface MesMetas {
  mes: string;
  total: number;
  completadas: number;
}

// Reportes del usuario: metas personales, proyectos y (cuando exista el módulo) sesiones de estudio.
export function EstadisticasPage() {
  const usuarioId = obtenerUsuarioId();
  const [hoy] = useState(() => new Date());
  const [metas, setMetas] = useState<EstadisticasMetas | null>(null);
  const [proyectos, setProyectos] = useState<ResumenProyecto[] | null>(null);
  const [sesiones, setSesiones] = useState<ResumenSesiones | null>(null);
  const [error, setError] = useState("");

  const meses = ultimosMeses(CANTIDAD_MESES, hoy);

  useEffect(() => {
    if (!usuarioId) return;
    window.api.estadisticasMetas({ idUsuario: usuarioId, desde: meses[0], hasta: meses[meses.length - 1] })
      .then(setMetas)
      .catch((e) => setError(mensajeDe(e)));
    window.api.resumenProyectos({ idUsuario: usuarioId, mes: mesDe(hoy), hoy: diaDe(hoy) })
      .then(setProyectos)
      .catch((e) => setError(mensajeDe(e)));
    window.api.resumenSesionesEstudio({
      idUsuario: usuarioId,
      desde: `${meses[0]}-01`,
      zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then(setSesiones)
      .catch((e) => setError(mensajeDe(e)));
  }, [usuarioId]);

  // Todos los meses aparecen en el gráfico, aunque no tengan metas.
  const porMes: MesMetas[] = meses.map((mes) => {
    const dato = metas?.porMes.find((m) => m.mes === mes);
    return { mes, total: dato?.total ?? 0, completadas: dato?.completadas ?? 0 };
  });
  const actual = porMes[porMes.length - 1];
  const totalPeriodo = porMes.reduce((n, m) => n + m.total, 0);
  const hechasPeriodo = porMes.reduce((n, m) => n + m.completadas, 0);
  const trasladadas = metas?.porMes.reduce((n, m) => n + m.trasladadas, 0) ?? 0;

  return (
    <PlantillaLayout titulo="Estadísticas" idActivo="estadisticas" usuario={{ nombre: "Usuario" }}>
      <div className="estadisticas">
        {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}

        <section className="estadisticas__seccion" aria-labelledby="titulo-metas">
          <header className="estadisticas__cabecera">
            <Target size={20} aria-hidden="true" />
            <h2 id="titulo-metas" className="estadisticas__titulo">Mis metas</h2>
            <span className="estadisticas__nota">Últimos {CANTIDAD_MESES} meses</span>
          </header>

          <div className="estadisticas__tiles">
            <Tile etiqueta="Este mes" valor={`${actual.completadas} de ${actual.total}`} detalle={actual.total ? `${porcentaje(actual.completadas, actual.total)}% cumplidas` : "Sin metas todavía"} />
            <Tile etiqueta={`Últimos ${CANTIDAD_MESES} meses`} valor={`${porcentaje(hechasPeriodo, totalPeriodo)}%`} detalle={`${hechasPeriodo} de ${totalPeriodo} cumplidas`} />
            <Tile etiqueta="Pasadas al mes siguiente" valor={String(trasladadas)} detalle="Pendientes que copiaste a otro mes" />
          </div>

          {metas === null ? (
            <p className="estadisticas__vacio" role="status">Cargando…</p>
          ) : totalPeriodo === 0 ? (
            <p className="estadisticas__vacio">Todavía no anotaste metas en estos meses. Las del inicio aparecen acá.</p>
          ) : (
            <GraficoBarras
              titulo="Metas cumplidas por mes"
              guias={[{ posicion: 100, texto: "100%" }, { posicion: 50, texto: "50%" }, { posicion: 0, texto: "0%" }]}
              actual={actual.mes}
              barras={porMes.map((d) => {
                const valor = porcentaje(d.completadas, d.total);
                return {
                  clave: d.mes,
                  etiqueta: nombreMes(d.mes),
                  altura: d.total ? valor : null,
                  valor: `${valor}%`,
                  detalle: d.total ? `${nombreMes(d.mes)}: ${d.completadas} de ${d.total} cumplidas (${valor}%)` : `${nombreMes(d.mes)}: sin metas`,
                };
              })}
            />
          )}
        </section>

        <section className="estadisticas__seccion" aria-labelledby="titulo-proyectos">
          <header className="estadisticas__cabecera">
            <FolderKanban size={20} aria-hidden="true" />
            <h2 id="titulo-proyectos" className="estadisticas__titulo">Proyectos</h2>
          </header>

          {proyectos === null ? (
            <p className="estadisticas__vacio" role="status">Cargando…</p>
          ) : proyectos.length === 0 ? (
            <p className="estadisticas__vacio">No estás en ningún proyecto todavía.</p>
          ) : (
            <div className="estadisticas__proyectos">
              {proyectos.map((p) => <TarjetaProyecto key={p.idProyecto} proyecto={p} />)}
            </div>
          )}
        </section>

        <section className="estadisticas__seccion" aria-labelledby="titulo-sesiones">
          <header className="estadisticas__cabecera">
            <Timer size={20} aria-hidden="true" />
            <h2 id="titulo-sesiones" className="estadisticas__titulo">Sesiones de estudio</h2>
            <span className="estadisticas__nota">Últimos {CANTIDAD_MESES} meses</span>
          </header>
          {sesiones === null ? (
            <p className="estadisticas__vacio" role="status">Cargando…</p>
          ) : (
            <SeccionSesiones resumen={sesiones} meses={meses} mesActual={actual.mes} />
          )}
        </section>
      </div>
    </PlantillaLayout>
  );
}

function Tile({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <div className="estadisticas__tile">
      <span className="estadisticas__tile-etiqueta">{etiqueta}</span>
      <strong className="estadisticas__tile-valor">{valor}</strong>
      <span className="estadisticas__tile-detalle">{detalle}</span>
    </div>
  );
}

// Gráfico de barras por mes. El mes actual va resaltado; al pasar el mouse se ve el detalle.
function GraficoBarras({ titulo, barras, guias, actual }: {
  titulo: string;
  barras: Barra[];
  guias: { posicion: number; texto: string }[];
  actual: string;
}) {
  const [activo, setActivo] = useState<string | null>(null);

  return (
    <figure className="grafico">
      <figcaption className="grafico__titulo">{titulo}</figcaption>
      <div className="grafico__area">
        {guias.map((g) => (
          <span key={g.posicion} className="grafico__guia" style={{ bottom: `${g.posicion}%` }}>
            <span className="grafico__guia-texto">{g.texto}</span>
          </span>
        ))}
        <ol className="grafico__barras">
          {barras.map((b) => {
            const mostrarValor = activo === b.clave || (activo === null && b.clave === actual && b.altura !== null);
            return (
              <li
                key={b.clave}
                className="grafico__columna"
                tabIndex={0}
                aria-label={b.detalle}
                onMouseEnter={() => setActivo(b.clave)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(b.clave)}
                onBlur={() => setActivo(null)}
              >
                {mostrarValor && (
                  <span className="grafico__valor" style={{ bottom: `calc(${b.altura ?? 0}% + 6px)` }}>
                    {activo === b.clave ? b.detalle : b.valor}
                  </span>
                )}
                {b.altura !== null ? (
                  <span className={`grafico__barra${b.clave === actual ? " grafico__barra--actual" : ""}`} style={{ height: `${Math.max(b.altura, 2)}%` }} />
                ) : (
                  <span className="grafico__sin-dato" aria-hidden="true">—</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <ol className="grafico__ejes" aria-hidden="true">
        {barras.map((b) => <li key={b.clave}>{b.etiqueta}</li>)}
      </ol>
    </figure>
  );
}

function SeccionSesiones({ resumen, meses, mesActual }: { resumen: ResumenSesiones; meses: string[]; mesActual: string }) {
  const { sesiones, minutos, objetivos, porMes, porMateria } = resumen;
  const vencidas = sesiones.completadas + sesiones.atrasadas;

  if (vencidas === 0 && minutos.estudiados === 0) {
    return (
      <p className="estadisticas__vacio">
        Todavía no terminaste sesiones en estos meses. <Link to="/sesiones">Planificá una sesión</Link> y acá vas a ver cuánto estudiaste.
      </p>
    );
  }

  // La escala del gráfico se redondea a horas enteras para que las guías sean claras.
  const maximo = Math.max(60, ...porMes.map((m) => m.minutos));
  const tope = Math.ceil(maximo / 60) * 60;
  const maxMateria = Math.max(1, ...porMateria.map((m) => m.minutos));

  return (
    <>
      <div className="estadisticas__tiles">
        <Tile etiqueta="Tiempo estudiado" valor={textoMinutos(minutos.estudiados)} detalle={minutos.planificados ? `${porcentaje(minutos.estudiados, minutos.planificados)}% de lo planificado` : "Sin sesiones terminadas"} />
        <Tile etiqueta="Sesiones cumplidas" valor={`${sesiones.completadas} de ${vencidas}`} detalle={sesiones.atrasadas ? `${sesiones.atrasadas} quedaron atrasadas` : "Ninguna atrasada"} />
        <Tile etiqueta="Objetivos de sesión" valor={`${objetivos.completados} de ${objetivos.total}`} detalle={objetivos.total ? `${porcentaje(objetivos.completados, objetivos.total)}% tildados` : "Sin objetivos cargados"} />
      </div>

      <GraficoBarras
        titulo="Tiempo estudiado por mes"
        guias={[{ posicion: 100, texto: `${tope / 60} h` }, { posicion: 50, texto: `${tope / 120} h` }, { posicion: 0, texto: "0" }]}
        actual={mesActual}
        barras={meses.map((mes) => {
          const dato = porMes.find((m) => m.mes === mes);
          return {
            clave: mes,
            etiqueta: nombreMes(mes),
            altura: dato ? (dato.minutos / tope) * 100 : null,
            valor: dato ? textoMinutos(dato.minutos) : "",
            detalle: dato ? `${nombreMes(mes)}: ${textoMinutos(dato.minutos)} estudiados` : `${nombreMes(mes)}: sin sesiones terminadas`,
          };
        })}
      />

      {porMateria.length > 0 && (
        <div className="aporte">
          <span className="aporte__titulo">Tiempo por materia</span>
          <ul className="aporte__lista">
            {porMateria.map((m) => (
              <li key={m.materia} className="aporte__fila aporte__fila--ancha" title={`${m.materia}: ${textoMinutos(m.minutos)}`}>
                <span className="aporte__nombre">{m.materia}</span>
                <span className="aporte__pista" aria-hidden="true">
                  <span className="aporte__hechas" style={{ width: `${(m.minutos / maxMateria) * 100}%` }} />
                </span>
                <span className="aporte__numero">{textoMinutos(m.minutos)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function TarjetaProyecto({ proyecto }: { proyecto: ResumenProyecto }) {
  const { tareas, metasMes, integrantes } = proyecto;
  const avance = porcentaje(tareas.hechas, tareas.total);
  const maximo = Math.max(1, ...integrantes.map((i) => i.hechas + i.pendientes));

  return (
    <article className="estadisticas__proyecto">
      <header className="estadisticas__proyecto-cabecera">
        <h3 className="estadisticas__proyecto-nombre">{proyecto.nombre}</h3>
        <span className="estadisticas__proyecto-avance">{tareas.total ? `${avance}%` : "—"}</span>
      </header>

      <div
        className="estadisticas__progreso"
        role="progressbar"
        aria-label="Tareas hechas"
        aria-valuemin={0}
        aria-valuemax={tareas.total}
        aria-valuenow={tareas.hechas}
      >
        <span style={{ width: `${avance}%` }} />
      </div>
      <p className="estadisticas__proyecto-texto">
        {tareas.total ? `${tareas.hechas} de ${tareas.total} tareas hechas` : "Todavía no hay tareas"}
      </p>

      <ul className="estadisticas__chips">
        <li className="estadisticas__chip"><Clock size={14} aria-hidden="true" /> {tareas.pendientes} pendientes</li>
        {tareas.vencidas > 0 && (
          <li className="estadisticas__chip estadisticas__chip--alerta"><AlertTriangle size={14} aria-hidden="true" /> {tareas.vencidas} vencidas</li>
        )}
        {tareas.sinAsignar > 0 && (
          <li className="estadisticas__chip"><UserX size={14} aria-hidden="true" /> {tareas.sinAsignar} sin asignar</li>
        )}
        <li className="estadisticas__chip"><CheckCircle2 size={14} aria-hidden="true" /> Metas del mes: {metasMes.completadas} de {metasMes.total}</li>
      </ul>

      {integrantes.length > 0 && (
        <div className="aporte">
          <div className="aporte__cabecera">
            <span className="aporte__titulo">Aporte de cada integrante</span>
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
    </article>
  );
}