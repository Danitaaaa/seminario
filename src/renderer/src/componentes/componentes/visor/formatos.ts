// Decide qué visor usa cada extensión. Lo que no está acá se abre con la app del sistema.
export type TipoVisor = 'pdf' | 'docx' | 'xlsx' | 'texto';

const VISORES: Record<string, TipoVisor> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'xlsx',
  txt: 'texto',
  md: 'texto',
};

export function tipoVisor(extension: string | null | undefined): TipoVisor | null {
  return VISORES[(extension ?? '').toLowerCase()] ?? null;
}