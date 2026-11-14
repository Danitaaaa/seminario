// src/main/logicaNoPersistente/lectorPlanEstudios/planConIA.ts
// Convierte lo que devuelve la IA para la tarea "materias" en la lista que se muestra (y se edita) antes de guardar.
// Si el lector manual (leerPlanEstudios) tiene su propio tipo de materia leída, adaptá el mapeo acá: es el único lugar.
import { EsquemaMaterias } from '../ia/esquemas/materias';

export interface MateriaLeidaIA {
  nombre: string;
  anio: number | null;
  cuatrimestre: 'primero' | 'segundo' | 'anual' | null;
  correlativas: string[];
}

export function aMateriasLeidas(contenido: unknown): MateriaLeidaIA[] {
  // Se vuelve a validar: lo que llega acá ya pasó por combinarMaterias, pero nada se asume.
  return EsquemaMaterias.parse(contenido).materias.map((m) => ({
    nombre: m.nombre.trim(),
    anio: m.anio,
    cuatrimestre: m.cuatrimestre,
    correlativas: [...m.correlativas],
  }));
}