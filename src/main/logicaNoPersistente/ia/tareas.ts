// src/main/logicaNoPersistente/ia/tareas.ts
// Registro ÚNICO de tareas: para sumar una (guía, plan, materias...) agregás su esquema zod,
// su prompt en prompts.ts y una entrada acá. El router y la cola no cambian.
import {
  aJsonSchema,
  COMBINAR,
  cuestionarioSchema,
  flashcardsSchema,
  mapaMentalSchema,
  EsquemaMaterias,
  combinarMaterias,
  guiaSchema,
  type Materias,
  resumenSchema,
  respuestaChatSchema,
  transcripcionPlanSchema,
} from './esquemas';
import {
  SISTEMA_CUESTIONARIO,
  SISTEMA_FLASHCARDS,
  SISTEMA_MAPA_MENTAL,
  SISTEMA_MATERIAS, 
  SISTEMA_RESUMEN,
  SISTEMA_GUIA,
  SISTEMA_CHAT,
  SISTEMA_TRANSCRIPCION_PLAN,
} from './prompts';
import type { Esquema } from './tipos';

export interface DefTarea {
  sistema: string;
  esquema: Esquema<unknown>;
  esquemaJson: object;
  /** Une las respuestas de cada fragmento en un solo resultado y lo valida con `esquema`. Lanza si no es válido. */
  combinar: (partes: unknown[], textoOriginal: string) => unknown;
}

// Lo único que se necesita de un esquema para validar el resultado unido (compatible con zod).
interface Validable {
  safeParse(dato: unknown): { success: boolean; data?: unknown; error?: { issues: { message: string }[] } };
}

// Usa la combinación de cada tipo (COMBINAR, en esquemas/index.ts) y valida el resultado con el esquema de la tarea.
// Así lo que sale de acá es lo mismo que ya validaba el flujo de Material con IA.
function combinarCon(tipo: keyof typeof COMBINAR, esquema: Validable): DefTarea['combinar'] {
  return (partes) => {
    if (partes.length === 0) throw new Error('La IA no devolvió contenido.');
    // El título de los resultados unidos sale del primer fragmento.
    const primero = partes[0] as { titulo?: unknown } | null;
    const titulo = typeof primero?.titulo === 'string' && primero.titulo.trim() ? primero.titulo : 'Material';
    const unido = (COMBINAR[tipo] as (p: unknown[], t: string) => unknown)(partes, titulo);

    const r = esquema.safeParse(unido);
    if (!r.success) {
      const motivos = [...new Set((r.error?.issues ?? []).map((i) => i.message))].join(' ');
      throw new Error(motivos || 'El contenido generado no es válido.');
    }
    return r.data;
  };
}

export const TAREAS_IA = {
  resumen: {
    sistema: SISTEMA_RESUMEN,
    esquema: resumenSchema,
    esquemaJson: aJsonSchema(resumenSchema),
    combinar: combinarCon('resumen', resumenSchema),
  },
  cuestionario: {
    sistema: SISTEMA_CUESTIONARIO,
    esquema: cuestionarioSchema,
    esquemaJson: aJsonSchema(cuestionarioSchema),
    combinar: combinarCon('cuestionario', cuestionarioSchema),
  },
  mapaMental: {
    sistema: SISTEMA_MAPA_MENTAL,
    esquema: mapaMentalSchema,
    esquemaJson: aJsonSchema(mapaMentalSchema),
    combinar: combinarCon('mapaMental', mapaMentalSchema),
  },
  flashcards: {
    sistema: SISTEMA_FLASHCARDS,
    esquema: flashcardsSchema,
    esquemaJson: aJsonSchema(flashcardsSchema),
    combinar: combinarCon('flashcards', flashcardsSchema),
  },
  materias: {
    sistema: SISTEMA_MATERIAS,
    esquema: EsquemaMaterias,
    esquemaJson: aJsonSchema(EsquemaMaterias),
    // Valida contra el texto del plan: la materia tiene que aparecer en él (esquemas/materias.ts).
    combinar: (partes, textoPlan) => combinarMaterias(partes as Materias[], textoPlan),
  },
  guia: {
    sistema: SISTEMA_GUIA,
    esquema: guiaSchema,
    esquemaJson: aJsonSchema(guiaSchema),
    combinar: combinarCon('guia', guiaSchema),
  },
  // Chat con IA: no hay fragmentos (no parte de un archivo), la respuesta es una sola.
  chat: {
    sistema: SISTEMA_CHAT,
    esquema: respuestaChatSchema,
    esquemaJson: aJsonSchema(respuestaChatSchema),
    combinar: (partes) => respuestaChatSchema.parse(partes[0]),
  },
  // Plan de estudios escaneado: el modelo lee las imágenes de las páginas; no hay fragmentos.
  transcripcionPlan: {
    sistema: SISTEMA_TRANSCRIPCION_PLAN,
    esquema: transcripcionPlanSchema,
    esquemaJson: aJsonSchema(transcripcionPlanSchema),
    combinar: (partes) => transcripcionPlanSchema.parse(partes[0]),
  },
} satisfies Record<string, DefTarea>;

export type TareaImplementada = keyof typeof TAREAS_IA;
export const NOMBRES_TAREAS = Object.keys(TAREAS_IA) as [TareaImplementada, ...TareaImplementada[]];