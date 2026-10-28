const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// AAAA-MM-DD según la hora local (no UTC).
export function hoyISO(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function etiquetaCorta(fechaISO: string): string {
  const [, mes, dia] = fechaISO.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}`;
}

export function estaVencida(fechaLimite: string | null, ahora: Date = new Date()): boolean {
  return fechaLimite !== null && fechaLimite < hoyISO(ahora);
}

export function formatearVence(fechaLimite: string | null, ahora: Date = new Date()): string {
  if (!fechaLimite) return 'Sin fecha';
  const verbo = estaVencida(fechaLimite, ahora) ? 'Venció' : 'Vence';
  return `${verbo} ${etiquetaCorta(fechaLimite)}`;
}

export function formatearHecha(fechaCompletada: string | null, ahora: Date = new Date()): string {
  if (!fechaCompletada) return 'Hecha';
  const fecha = new Date(fechaCompletada);
  if (Number.isNaN(fecha.getTime())) return 'Hecha';

  const dias = Math.round((inicioDelDia(ahora).getTime() - inicioDelDia(fecha).getTime()) / DIA_MS);
  if (dias <= 0) return 'Hecha hoy';
  if (dias === 1) return 'Hecha ayer';
  if (dias <= 6) return `Hecha hace ${dias} días`;
  return `Hecha ${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
}
