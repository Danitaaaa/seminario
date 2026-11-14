// Material con IA de punta a punta con el router y la cola reales y un proveedor falso (sin red).
import { test, expect, beforeAll } from 'vitest';
import { GeneradorMaterialIA } from '../../logicaNoPersistente/ia/generadorMaterialIA';
import { ColaEjecucion, type EventoProgreso } from '../../logicaNoPersistente/ia/colaEjecucion';
import { RouterModelos } from '../../logicaNoPersistente/ia/routerModelos';
import { TAREAS, type ProveedorModelo, type Tarea } from '../../logicaNoPersistente/ia/tipos';
import { mapaMentalSchema } from '../../logicaNoPersistente/ia/esquemas';
import { crearPdfDePrueba, falso, mapaValido } from './ayudas';

let pdf = '';
beforeAll(async () => {
  pdf = await crearPdfDePrueba();
});

// La misma cadena que en la app: luna → gemini → gemma.
const routerReal = (proveedores: ProveedorModelo[], online = true) =>
  new RouterModelos(proveedores, {
    cadenas: Object.fromEntries(TAREAS.map((t) => [t, ['luna', 'gemini', 'gemma']])) as Record<Tarea, string[]>,
    hayInternet: () => online,
    reintentosSalida: 1,
  });

const generarMapa = (router: RouterModelos, cola: ColaEjecucion, id: string, preferencias?: string) =>
  cola.add(id, (ctx) =>
    new GeneradorMaterialIA(router).generar({ ruta: pdf, extension: 'pdf', nombre: 'Célula' }, 'mapaMental', ctx, preferencias));

const MAPA = JSON.stringify(mapaValido);

test('generador: si GptMini falla responde Gemini, y el resultado pasa zod', async () => {
  const luna = falso('luna', 'online', [new Error('caída')]);
  const gemini = falso('gemini', 'online', ['```json\n' + MAPA + '\n```']);
  const { contenido, proveedores } = await generarMapa(routerReal([luna, gemini]), new ColaEjecucion(1), 'g1');
  expect(mapaMentalSchema.safeParse(contenido).success).toBe(true);
  expect(proveedores).toEqual(['gemini']);
});

test('generador: al modelo le llegan el esquema, el material delimitado y las indicaciones', async () => {
  const gemini = falso('gemini', 'online', [MAPA]);
  await generarMapa(routerReal([gemini]), new ColaEjecucion(1), 'g2', 'nivel parcial');
  const pedido = gemini.pedidos[0]!;
  expect(JSON.stringify(pedido.esquemaJson).includes('padreId')).toBe(true);
  expect(pedido.usuario.includes('<<<MATERIAL>>>') && pedido.usuario.includes('celula')).toBe(true);
  expect(pedido.usuario.includes('nivel parcial')).toBe(true);
  expect(pedido.sistema.includes('mapa mental')).toBe(true);
});

test('generador: si la respuesta no cumple zod, el router reintenta con el error', async () => {
  const gemini = falso('gemini', 'online', ['{"titulo":"t","nodos":[]}', MAPA]);
  await generarMapa(routerReal([gemini]), new ColaEjecucion(1), 'g3');
  expect(gemini.llamadas).toBe(2);
  expect(gemini.pedidos[1]!.usuario.includes('[CORRECCIÓN]')).toBe(true);
});

test('generador: sin internet usa Gemma', async () => {
  const luna = falso('luna', 'online', [MAPA]);
  const gemma = falso('gemma', 'local', [MAPA]);
  const { proveedores } = await generarMapa(routerReal([luna, gemma], false), new ColaEjecucion(1), 'g4');
  expect(proveedores).toEqual(['gemma']);
  expect(luna.llamadas).toBe(0);
});

test('generador: el progreso sale por la cola única', async () => {
  const eventos: string[] = [];
  const cola = new ColaEjecucion(1, (e: EventoProgreso) => eventos.push(e.total ? `${e.estado} ${e.hechas}/${e.total}` : e.estado));
  await generarMapa(routerReal([falso('gemini', 'online', [MAPA])]), cola, 'g5');
  expect(eventos).toEqual(['en_cola', 'ejecutando', 'ejecutando 1/1', 'terminado']);
});

test('generador: si se cancela, no devuelve nada aunque la IA responda tarde', async () => {
  const cola = new ColaEjecucion(1);
  const lento = falso('gemini', 'online', [MAPA], true, 150);
  setTimeout(() => cola.cancelar('g6'), 30);
  await expect(generarMapa(routerReal([lento]), cola, 'g6')).rejects.toMatchObject({ name: 'AbortError' });
});
