import { z } from 'zod';

// El mapa se pide como lista PLANA de nodos con padreId, no como árbol anidado:
// los modelos chicos (Gemma) responden mucho mejor así y el JSON Schema no necesita $ref.
export const nodoMapaSchema = z.object({
  id: z.string().trim().min(1).describe('Identificador único corto, ej: "n1"'),
  texto: z.string().trim()
    .min(1, { error: 'Hay un nodo sin texto.' })
    .max(120, { error: 'El texto de un nodo no puede superar los 120 caracteres.' })
    .describe('Concepto, pocas palabras'),
  padreId: z.string().nullable().describe('id del nodo padre; null solo para la raíz'),
});

export const mapaMentalSchema = z.object({
  titulo: z.string().trim()
    .min(1, { error: 'El mapa necesita un título.' })
    .max(200, { error: 'El título no puede superar los 200 caracteres.' }),
  nodos: z.array(nodoMapaSchema).min(2, { error: 'El mapa necesita al menos 2 nodos.' }),
}).superRefine((mapa, ctx) => {
  const ids = new Set<string>();
  for (const n of mapa.nodos) {
    if (ids.has(n.id)) ctx.addIssue({ code: 'custom', path: ['nodos'], message: `Hay un id repetido: ${n.id}.` });
    ids.add(n.id);
  }

  const raices = mapa.nodos.filter((n) => n.padreId === null);
  if (raices.length !== 1) {
    ctx.addIssue({ code: 'custom', path: ['nodos'], message: `Tiene que haber exactamente un nodo central (hay ${raices.length}).` });
    return;
  }

  for (const n of mapa.nodos) {
    if (n.padreId !== null && !ids.has(n.padreId)) {
      ctx.addIssue({ code: 'custom', path: ['nodos'], message: `El nodo ${n.id} cuelga de un nodo que no existe (${n.padreId}).` });
    }
  }

  // Todos tienen que llegar a la raíz: así no quedan sueltos ni hay ciclos.
  const hijos = new Map<string, string[]>();
  for (const n of mapa.nodos) if (n.padreId) hijos.set(n.padreId, [...(hijos.get(n.padreId) ?? []), n.id]);
  const visitados = new Set<string>();
  const pila = [raices[0].id];
  while (pila.length) {
    const id = pila.pop()!;
    if (visitados.has(id)) continue;
    visitados.add(id);
    pila.push(...(hijos.get(id) ?? []));
  }
  if (visitados.size !== mapa.nodos.length) {
    ctx.addIssue({ code: 'custom', path: ['nodos'], message: 'Hay nodos desconectados del nodo central.' });
  }
});

export type NodoMapa = z.infer<typeof nodoMapaSchema>;
export type MapaMental = z.infer<typeof mapaMentalSchema>;
