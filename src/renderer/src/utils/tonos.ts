import type { HorarioCursado } from '../types/horarios';
import '../styles/tonos.css';

// Tonos que el usuario puede elegir para sus materias. No son colores fijos:
// cada uno sale de la paleta activa (ver styles/tonos.css), así que cambian
// solos al cambiar de paleta o de modo.
export const TONOS = [
  { id: 0, nombre: 'Principal' },
  { id: 1, nombre: 'Claro' },
  { id: 2, nombre: 'Acento' },
  { id: 3, nombre: 'Intermedio' },
  { id: 4, nombre: 'Acero' },
  { id: 5, nombre: 'Profundo' },
] as const;

export const claseTono = (tono: number) => `tono tono--${tono}`;

// Si la materia no tiene tono elegido, se asigna uno según su nombre (siempre el mismo).
function tonoAutomatico(titulo: string): number {
  let hash = 0;
  for (const c of titulo.toLowerCase()) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash % TONOS.length;
}

// El tono es de la materia: se toma el de cualquiera de sus bloques que lo tenga.
export function tonoDeMateria(titulo: string, horarios: HorarioCursado[]): number {
  const conTono = horarios.find((h) => h.titulo === titulo && h.tono !== null);
  return conTono?.tono ?? tonoAutomatico(titulo);
}