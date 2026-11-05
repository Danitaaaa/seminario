import type { EstadoNota, Nota, ResumenCuaderno, TipoNota } from '../../types/cuadernos';

export const TIPOS_NOTA: { valor: TipoNota; nombre: string; corto: string }[] = [
  { valor: 'parcial', nombre: 'Parcial', corto: 'Parcial' },
  { valor: 'recuperatorio', nombre: 'Recuperatorio', corto: 'Recup.' },
  { valor: 'tp', nombre: 'Trabajo práctico', corto: 'TP' },
  { valor: 'final', nombre: 'Final', corto: 'Final' },
  { valor: 'otro', nombre: 'Otro', corto: 'Otro' },
];
export const CORTO_TIPO = Object.fromEntries(TIPOS_NOTA.map((t) => [t.valor, t.corto])) as Record<TipoNota, string>;

export const ESTADOS_NOTA: { valor: EstadoNota; nombre: string }[] = [
  { valor: 'aprobado', nombre: 'Aprobado' },
  { valor: 'desaprobado', nombre: 'Desaprobado' },
  { valor: 'sin_definir', nombre: 'Sin definir' },
  { valor: 'pendiente', nombre: 'Pendiente' },
];
export const NOMBRE_ESTADO_NOTA = Object.fromEntries(ESTADOS_NOTA.map((e) => [e.valor, e.nombre])) as Record<EstadoNota, string>;

// Misma regla que el backend, para mostrar qué estado va a quedar mientras se carga la nota.
export function estadoPorNota(nota: number | null): EstadoNota {
  if (nota === null) return 'pendiente';
  if (nota >= 7) return 'aprobado';
  if (nota < 4) return 'desaprobado';
  return 'sin_definir';
}

// "2026-11-12" → "12/11"
export const fechaCorta = (fecha: string | null) => (fecha ? `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}` : '');

export const formatoNota = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export function promedio(notas: Nota[]): number | null {
  const con = notas.filter((n) => n.nota !== null);
  return con.length ? con.reduce((s, n) => s + n.nota!, 0) / con.length : null;
}

// Cada cuaderno toma uno de los tonos de la paleta, siempre el mismo.
export const tonoDe = (idCuaderno: number) => idCuaderno % 4;

// Alto del lomo en el estante (entre 70 y 100 %), fijo para cada materia.
export function altoLomo(nombre: string): number {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 70 + (h % 31);
}

// Alturas (en %) de los lomos que simulan el estante cuando todavía está vacío.
export const LOMOS_DE_MUESTRA = [78, 92, 70, 86, 96, 74, 88, 80];

export const progresoNotas = (c: ResumenCuaderno) => (c.notasTotal ? c.notasCargadas / c.notasTotal : 0);

// Los cuadernos de materias que se están cursando.
export const cuadernosCursando = (cuadernos: ResumenCuaderno[]) => cuadernos.filter((c) => c.materia.estado === 'cursando');
