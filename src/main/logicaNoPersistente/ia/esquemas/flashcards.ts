// src/main/logicaNoPersistente/ia/esquemas/flashcards.ts
import { z } from 'zod';

export const flashcardsSchema = z.object({
  tarjetas: z
    .array(
      z.object({
        frente: z.string().min(3).max(300),
        dorso: z.string().min(1).max(1000),
        fuente: z.string().min(10), // fragmento literal del material
      }),
    )
    .min(1)
    .max(50),
});
export type Flashcards = z.infer<typeof flashcardsSchema>;

/** Validación semántica que zod no puede hacer: la fuente debe existir en el material. */
export function validarFuentes(f: Flashcards, material: string): Flashcards {
  const norm = (t: string) => t.replace(/\s+/g, ' ').toLowerCase();
  const base = norm(material);
  const vistos = new Set<string>();
  const validas = f.tarjetas.filter((t) => {
    const clave = norm(t.frente);
    if (vistos.has(clave) || t.frente === t.dorso || !base.includes(norm(t.fuente))) return false;
    vistos.add(clave);
    return true;
  });
  if (validas.length === 0) throw new Error('Ninguna tarjeta tiene fuente verificable');
  return { tarjetas: validas };
}

// Entrada del IPC: generar flashcards desde un archivo de Material.
export const generarFlashcardsSchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  idArchivo: z.number().int().positive(),
  cantidad: z.number().int().min(3).max(50).optional(),
  indicaciones: z.string().trim().max(1800, { error: 'Las indicaciones no pueden superar los 1800 caracteres.' }).optional(),
});
