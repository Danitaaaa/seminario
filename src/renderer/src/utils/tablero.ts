import type { Miembro } from '../types/proyectos';
import type {
  ColorMiembro,
  ColumnaMiembro,
  FiltroTareas,
  MiembroTablero,
  SegmentoAporte,
  Tarea,
} from '../types/tareas';

// Un color por integrante, en el orden de las columnas (el primero es para "Vos").
const PALETA: ColorMiembro[] = [
  { fondo: '#2B3A67', texto: '#FFFFFF' },
  { fondo: '#F2B45C', texto: '#4A3410' },
  { fondo: '#5BBFAD', texto: '#0F3B33' },
  { fondo: '#C98B9B', texto: '#3E1C27' },
  { fondo: '#8E86C8', texto: '#FFFFFF' },
  { fondo: '#7A9E7E', texto: '#12301A' },
];

export const COLOR_SIN_ASIGNAR = '#B9BDC9';

type MiembroConIdGlobal = Miembro & { idGlobalUsuario: string };

// Único punto donde se traduce un Miembro del proyecto al tablero.
// Solo se llama con miembros que ya tienen id global (ver armarColumnas).
export function aMiembroTablero(miembro: MiembroConIdGlobal): MiembroTablero {
  return {
    idGlobal: miembro.idGlobalUsuario,
    nombre: miembro.nombre ?? '',
    rol: miembro.rol,
  };
}

// idGlobalActual es null en proyectos personales (sin cuenta sincronizada): en ese caso
// no hay columnas de personas, solo "Sin asignar".
export function armarColumnas(miembros: Miembro[], idGlobalActual: string | null): ColumnaMiembro[] {
  const esActual = (id: string) => idGlobalActual !== null && id === idGlobalActual;

  const tablero = miembros
    .filter((m): m is MiembroConIdGlobal => m.activo && m.rol !== 'lector' && m.idGlobalUsuario != null)
    .map(aMiembroTablero);

  // "Vos" primero; el resto conserva el orden original.
  tablero.sort((a, b) => Number(esActual(b.idGlobal)) - Number(esActual(a.idGlobal)));

  return tablero.map((m, i) => ({
    ...m,
    color: PALETA[i % PALETA.length],
    esYo: esActual(m.idGlobal),
  }));
}

export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  return palabras
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

// "Camila Rossi" -> "Camila R."
export function nombreCorto(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 2) return nombre.trim();
  return `${palabras[0]} ${palabras[palabras.length - 1][0].toUpperCase()}.`;
}

// Columna a la que pertenece una tarea. Si el asignado ya no está en el proyecto, vuelve a "sin asignar".
export function columnaDe(tarea: Tarea, idsColumnas: Set<string>): string | null {
  return tarea.idAsignadoGlobal !== null && idsColumnas.has(tarea.idAsignadoGlobal)
    ? tarea.idAsignadoGlobal
    : null;
}

export function agruparPorColumna(
  tareas: Tarea[],
  columnas: ColumnaMiembro[],
): Map<string | null, Tarea[]> {
  const ids = new Set(columnas.map((c) => c.idGlobal));
  const grupos = new Map<string | null, Tarea[]>();
  grupos.set(null, []);
  for (const c of columnas) grupos.set(c.idGlobal, []);

  for (const t of tareas) grupos.get(columnaDe(t, ids))?.push(t);
  for (const lista of grupos.values()) lista.sort((a, b) => a.orden - b.orden || a.idTarea - b.idTarea);
  return grupos;
}

export function coincideFiltro(tarea: Tarea, filtro: FiltroTareas, enSinAsignar: boolean): boolean {
  switch (filtro) {
    case 'pendientes':
      return !tarea.completada;
    case 'hechas':
      return tarea.completada;
    case 'sinAsignar':
      return enSinAsignar;
    default:
      return true;
  }
}

export function contarFiltros(
  tareas: Tarea[],
  grupos: Map<string | null, Tarea[]>,
): Record<FiltroTareas, number> {
  return {
    todas: tareas.length,
    pendientes: tareas.filter((t) => !t.completada).length,
    hechas: tareas.filter((t) => t.completada).length,
    sinAsignar: grupos.get(null)?.length ?? 0,
  };
}

// Cuánto aporta cada integrante a lo ya hecho, medido sobre el total del proyecto.
export function segmentosAporte(
  columnas: ColumnaMiembro[],
  grupos: Map<string | null, Tarea[]>,
  total: number,
): SegmentoAporte[] {
  const hechasDe = (clave: string | null) => grupos.get(clave)?.filter((t) => t.completada).length ?? 0;
  const porcentaje = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  const segmentos: SegmentoAporte[] = columnas.map((c) => ({
    clave: c.idGlobal,
    nombre: c.esYo ? 'Vos' : nombreCorto(c.nombre),
    hechas: hechasDe(c.idGlobal),
    porcentaje: porcentaje(hechasDe(c.idGlobal)),
    fondo: c.color.fondo,
  }));

  const sinAsignar = hechasDe(null);
  if (sinAsignar > 0) {
    segmentos.push({
      clave: 'sin-asignar',
      nombre: 'Sin asignar',
      hechas: sinAsignar,
      porcentaje: porcentaje(sinAsignar),
      fondo: COLOR_SIN_ASIGNAR,
    });
  }
  return segmentos.filter((s) => s.hechas > 0);
}