import type { CuatrimestreCursada } from '../types/materias';

// "AAAA-MM-DD" como fecha local (sin pasar por UTC, así no se corre un día).
export const fechaDeTexto = (texto: string) => {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const textoDeFecha = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

// 10/08/2026 (o 10/08 si se pide corto).
export const fechaCorta = (texto: string, conAnio = true) => {
  const [a, m, d] = texto.split('-');
  return conAnio ? `${d}/${m}/${a}` : `${d}/${m}`;
};

export const rangoCuatrimestre = (c: Pick<CuatrimestreCursada, 'fechaInicio' | 'fechaFin'>) =>
  `${fechaCorta(c.fechaInicio, false)} al ${fechaCorta(c.fechaFin)}`;

const hoySinHora = (hoy: Date) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
const semanasEntre = (desde: Date, hasta: Date) => Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / (7 * 86_400_000)));

export type Momento = 'actual' | 'proximo' | 'terminado';

export function momentoDe(c: CuatrimestreCursada, hoy = new Date()): Momento {
  const dia = hoySinHora(hoy);
  if (dia < fechaDeTexto(c.fechaInicio)) return 'proximo';
  if (dia > fechaDeTexto(c.fechaFin)) return 'terminado';
  return 'actual';
}

// "Actual · faltan 3 semanas", "Empieza en 16 semanas" o "Terminado".
export function estadoCuatrimestre(c: CuatrimestreCursada, hoy = new Date()): string {
  const dia = hoySinHora(hoy);
  const momento = momentoDe(c, hoy);
  if (momento === 'terminado') return 'Terminado';
  if (momento === 'proximo') {
    const n = semanasEntre(dia, fechaDeTexto(c.fechaInicio));
    return `Empieza en ${n} ${n === 1 ? 'semana' : 'semanas'}`;
  }
  const n = semanasEntre(dia, fechaDeTexto(c.fechaFin));
  return `Actual · ${n === 1 ? 'falta 1 semana' : `faltan ${n} semanas`}`;
}

// El que se cursa hoy; si no hay, el próximo que empieza; si no, el último que terminó.
export function cuatrimestreActual(lista: CuatrimestreCursada[], hoy = new Date()): CuatrimestreCursada | null {
  const actual = lista.find((c) => momentoDe(c, hoy) === 'actual');
  if (actual) return actual;
  const proximos = lista.filter((c) => momentoDe(c, hoy) === 'proximo').sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  if (proximos.length) return proximos[0];
  return [...lista].sort((a, b) => b.fechaFin.localeCompare(a.fechaFin))[0] ?? null;
}

// Fechas sugeridas para un cuatrimestre nuevo (calendario típico de Argentina).
export function fechasSugeridas(anio: number, tipo: 'primero' | 'segundo'): { fechaInicio: string; fechaFin: string } {
  return tipo === 'primero'
    ? { fechaInicio: `${anio}-03-16`, fechaFin: `${anio}-07-04` }
    : { fechaInicio: `${anio}-08-10`, fechaFin: `${anio}-11-28` };
}
