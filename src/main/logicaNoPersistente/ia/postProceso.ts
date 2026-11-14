// src/main/logicaNoPersistente/ia/postproceso.ts
// El material se procesa en FRAGMENTOS: cada fragmento da un resultado. Acá se unen en uno solo
// y se descarta lo que no pasa las validaciones de contenido (la fuente debe estar en el material).
import {
  validarFuentes,
  type Flashcards,
  type Resumen,
} from './esquemas.js';

export function combinarResumenes(partes: Resumen[]): Resumen {
  const primero = partes[0];
  if (!primero) throw new Error('No hay partes para combinar');
  return {
    titulo: primero.titulo,
    puntos: [...new Set(partes.flatMap((p) => p.puntos))].slice(0, 20),
    resumen: partes.map((p) => p.resumen).join('\n\n').slice(0, 4000),
  };
}

export function combinarFlashcards(partes: Flashcards[], material: string): Flashcards {
  return validarFuentes({ tarjetas: partes.flatMap((p) => p.tarjetas) }, material);
}
