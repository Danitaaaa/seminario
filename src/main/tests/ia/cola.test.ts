import { test, expect } from 'vitest';
import { ColaEjecucion, mapearConProgreso } from '../../logicaNoPersistente/ia/colaEjecucion';

// ---------- cola ----------
const dormir = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(signal.reason);
    });
  });

test('respeta la concurrencia', async () => {
  const cola = new ColaEjecucion(2);
  let activas = 0;
  let max = 0;
  const tarea = async () => {
    activas++;
    max = Math.max(max, activas);
    await dormir(20);
    activas--;
  };
  await Promise.all([1, 2, 3, 4, 5].map((i) => cola.add(`t${i}`, tarea)));
  expect(max).toBe(2);
});

test('cancela un trabajo en espera sin ejecutarlo', async () => {
  const cola = new ColaEjecucion(1);
  let corrio = false;
  const a = cola.add('a', () => dormir(30));
  const b = cola.add('b', async () => {
    corrio = true;
  });
  expect(cola.cancelar('b')).toBe(true);
  await expect(b).rejects.toThrow(/cancelada/);
  await a;
  expect(corrio).toBe(false);
});

test('cancela un trabajo en ejecución y libera el lugar', async () => {
  const cola = new ColaEjecucion(1);
  const a = cola.add('a', ({ signal }) => dormir(5_000, signal));
  let b2 = false;
  const b = cola.add('b', async () => {
    b2 = true;
  });
  await dormir(10);
  cola.cancelar('a');
  await expect(a).rejects.toThrow();
  await b;
  expect(b2).toBe(true);
});

test('reporta progreso "parte N de M" y se corta entre fragmentos', async () => {
  const eventos: string[] = [];
  const cola = new ColaEjecucion(1, (e) => e.hechas && eventos.push(`${e.hechas}/${e.total}`));
  const p = cola.add('doc', (ctx) =>
    mapearConProgreso([1, 2, 3, 4], ctx, async (n) => {
      await dormir(15);
      return n * 2;
    }),
  );
  expect(await p).toEqual([2, 4, 6, 8]);
  expect(eventos).toEqual(['1/4', '2/4', '3/4', '4/4']);

  const cola2 = new ColaEjecucion(1);
  const q = cola2.add('doc2', (ctx) =>
    mapearConProgreso([1, 2, 3, 4], ctx, async () => dormir(30)),
  );
  await dormir(40);
  cola2.cancelar('doc2');
  await expect(q).rejects.toThrow();
});

test('id duplicado se rechaza', async () => {
  const cola = new ColaEjecucion(1);
  const a = cola.add('x', () => dormir(10));
  await expect(cola.add('x', async () => 1)).rejects.toThrow(/Ya existe/);
  await a;
});

