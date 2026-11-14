// src/main/logicaNoPersistente/ia/esquemas/materias.ts
// Tarea "materias": la IA lee el texto de un plan de estudios y devuelve la lista de materias.
// Reglas de Azure en modo estricto: sin `.optional()`, los campos que pueden faltar son `.nullable()`.
import { z } from 'zod';

export const EsquemaMaterias = z.object({
  materias: z
    .array(
      z.object({
        nombre: z.string().min(3).max(100),
        anio: z.number().int().min(1).max(10).nullable(),
        cuatrimestre: z.enum(['primero', 'segundo', 'anual']).nullable(),
        // Nombres de otras materias del mismo plan (tal como figuran en el plan).
        correlativas: z.array(z.string().min(3).max(100)).max(30),
      }),
    )
    .min(1)
    .max(200),
});
export type Materias = z.infer<typeof EsquemaMaterias>;

const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Validación que zod no puede hacer: la materia tiene que aparecer en el texto del plan
 * (si no, la IA la inventó), sin repetidas, y una materia no puede ser correlativa de sí misma.
 */
export function validarMaterias(m: Materias, textoPlan: string): Materias {
  const base = ` ${norm(textoPlan)} `;
  const vistas = new Set<string>();
  const validas = m.materias.filter((x) => {
    const clave = norm(x.nombre);
    if (!clave || vistas.has(clave) || !base.includes(` ${clave} `)) return false;
    vistas.add(clave);
    return true;
  });
  if (validas.length === 0) throw new Error('Ninguna materia aparece en el texto del plan');
  return {
    materias: validas.map((x) => ({
      ...x,
      correlativas: [...new Set(x.correlativas.map((c) => c.trim()).filter((c) => norm(c) !== norm(x.nombre)))],
    })),
  };
}

/** Une lo que devolvió cada fragmento del plan. */
export function combinarMaterias(partes: Materias[], textoPlan: string): Materias {
  return validarMaterias({ materias: partes.flatMap((p) => p.materias).slice(0, 200) }, textoPlan);
}

// Entrada del IPC: analizar con IA el texto pegado del plan de estudios.
export const leerPlanIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  texto: z.string().trim().min(1, 'Pegá el texto del plan.').max(50000, 'El texto es demasiado largo.'),
});