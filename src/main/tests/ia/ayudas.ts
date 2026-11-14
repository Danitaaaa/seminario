// Ayudas compartidas por los tests de IA: proveedores falsos que no tocan la red.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { MapaMental } from '../../logicaNoPersistente/ia/esquemas';
import { RouterModelos, type EventoRouter } from '../../logicaNoPersistente/ia/routerModelos';
import type { PedidoCrudo, ProveedorModelo } from '../../logicaNoPersistente/ia/tipos';

export function falso(
  id: string,
  tipo: 'online' | 'local',
  respuestas: (string | Error)[],
  disponible = true,
  demoraMs = 0, // para simular una IA lenta (pruebas de cancelación)
): ProveedorModelo & { llamadas: number; pedidos: PedidoCrudo[] } {
  const p = {
    id,
    tipo,
    llamadas: 0,
    pedidos: [] as PedidoCrudo[], // lo que le llegó al modelo, para revisarlo en las pruebas
    disponible: async () => disponible,
    generarJson: async (pedido: PedidoCrudo) => {
      const r = respuestas[Math.min(p.llamadas, respuestas.length - 1)]!;
      p.llamadas++;
      p.pedidos.push(pedido);
      if (demoraMs) await new Promise((res) => setTimeout(res, demoraMs));
      if (r instanceof Error) throw r;
      return r;
    },
  };
  return p;
}

export const esquema = {
  parse(d: unknown): { x: number } {
    if (typeof d === 'object' && d && typeof (d as { x?: unknown }).x === 'number') return d as { x: number };
    throw new Error('x debe ser número');
  },
};
export const pedido = (signal?: AbortSignal) => ({ sistema: 's', usuario: 'u', esquema, esquemaJson: {}, signal });
export const cadenas = { resumen: ['luna', 'gemini', 'gemma'] } as never;
export const router = (ps: ProveedorModelo[], online = true, eventos: EventoRouter[] = []) =>
  new RouterModelos(ps, { cadenas, hayInternet: () => online, alEvento: (e) => eventos.push(e) });

// ---------- Material con IA ----------

export const carpetaTemporal = () => mkdtempSync(join(tmpdir(), 'syntra-ia-'));

export const mapaValido: MapaMental = {
  titulo: 'Célula',
  nodos: [
    { id: 'r', texto: 'Célula', padreId: null },
    { id: 'a', texto: 'Organelas', padreId: 'r' },
    { id: 'b', texto: 'Mitocondria', padreId: 'a' },
  ],
};

/** PDF de 2 páginas, con una palabra cortada con guion al final de un renglón ("celu-" / "la"). */
export async function crearPdfDePrueba(): Promise<string> {
  const doc = await PDFDocument.create();
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  const paginas = [
    ['1. Introduccion', 'La celula es la unidad basica de la vida.', 'Todos los seres vivos estan formados por celulas.'],
    ['2. Organelas', 'Las mitocondrias producen energia para la celu-', 'la mediante respiracion celular.'],
  ];
  for (const lineas of paginas) {
    const pagina = doc.addPage();
    lineas.forEach((linea, i) => pagina.drawText(linea, { x: 50, y: 700 - i * 20, size: 12, font: fuente }));
  }
  const archivo = join(carpetaTemporal(), 'prueba.pdf');
  writeFileSync(archivo, await doc.save());
  return archivo;
}
