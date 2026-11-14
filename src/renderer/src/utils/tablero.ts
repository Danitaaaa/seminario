import type { Miembro } from '../types/proyectos';
import type {
  ColorMiembro,
  ColumnaMiembro,
  FiltroTareas,
  MiembroTablero,
  SegmentoAporte,
  Tarea,
} from '../types/tareas';

// Un color por integrante. Como en Google Docs: en tu pantalla no se repiten
// (vos primero, el resto en orden) y cada uno tiene el mismo color en todo el proyecto.
export const PALETA: ColorMiembro[] = [
  { fondo: '#2B3A67', texto: '#FFFFFF' },
  { fondo: '#F2B45C', texto: '#4A3410' },
  { fondo: '#5BBFAD', texto: '#0F3B33' },
  { fondo: '#C98B9B', texto: '#3E1C27' },
  { fondo: '#8E86C8', texto: '#FFFFFF' },
  { fondo: '#7A9E7E', texto: '#12301A' },
  { fondo: '#E07A5F', texto: '#FFFFFF' },
  { fondo: '#4F9BD9', texto: '#FFFFFF' },
  { fondo: '#D9A5C8', texto: '#4A1F3D' },
  { fondo: '#B5A642', texto: '#2E2A0A' },
];

// Clave de un integrante: su id global; si todavía no tiene (invitación pendiente), el mail.
export const claveMiembro = (m: Miembro): string => m.idGlobalUsuario ?? m.mail.toLowerCase();

// Color de cada integrante del proyecto, sin repetir: primero los que eligieron su color (vos antes que nadie),
// después el resto, con los colores que quedaron libres y en el orden de la lista.
export function coloresDeMiembros(miembros: Miembro[], esYo: (m: Miembro) => boolean): Map<string, ColorMiembro> {
  const ordenados = [...miembros].sort((a, b) => Number(esYo(b)) - Number(esYo(a)));
  const usados = new Set<number>();
  const colores = new Map<string, number>();
  for (const m of ordenados) {
    const elegido = m.colorAvatar;
    if (elegido != null && elegido >= 0 && elegido < PALETA.length && !usados.has(elegido)) {
      colores.set(claveMiembro(m), elegido);
      usados.add(elegido);
    }
  }
  let siguiente = 0;
  for (const m of ordenados) {
    if (colores.has(claveMiembro(m))) continue;
    while (usados.has(siguiente % PALETA.length) && usados.size < PALETA.length) siguiente++;
    colores.set(claveMiembro(m), siguiente % PALETA.length);
    usados.add(siguiente % PALETA.length);
    siguiente++;
  }
  return new Map([...colores].map(([clave, i]) => [clave, PALETA[i]]));
}

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

  const colores = coloresDeMiembros(miembros.filter((m) => m.activo), (m) => m.idGlobalUsuario !== null && esActual(m.idGlobalUsuario));
  const tablero = miembros
    .filter((m): m is MiembroConIdGlobal => m.activo && m.idGlobalUsuario != null)
    .map(aMiembroTablero);

  // "Vos" primero; el resto conserva el orden original.
  tablero.sort((a, b) => Number(esActual(b.idGlobal)) - Number(esActual(a.idGlobal)));
  console.debug('miembros:', miembros.map(m => ({ mail: m.mail, idGlobal: m.idGlobalUsuario })), 'yo:', idGlobalActual);
  return tablero.map((m) => ({
    ...m,
    color: colores.get(m.idGlobal) ?? PALETA[0],
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