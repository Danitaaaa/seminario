import { test, expect } from 'vitest';
import { ColaEjecucion, mapearConProgreso, type EventoProgreso } from '../../logicaNoPersistente/ia/colaEjecucion';
import { ErrorAbortado } from '../../logicaNoPersistente/ia/errores';

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
  expect(cola.pendientes).toBe(1);
  expect(cola.cancelar('b')).toBe(true);
  expect(cola.pendientes).toBe(0);
  await expect(b).rejects.toBeInstanceOf(ErrorAbortado);
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
  expect(cola.ejecutando).toBe(1);
  cola.cancelar('a');
  await expect(a).rejects.toBeInstanceOf(ErrorAbortado);
  await b;
  expect(b2).toBe(true);
});

test('reporta progreso "parte N de M" y se corta entre fragmentos', async () => {
  const eventos: string[] = [];
  const cola = new ColaEjecucion(1, (e) => {
    if (e.hechas) eventos.push(`${e.hechas}/${e.total}`);
  });
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

test('informa los estados en_cola → ejecutando → terminado', async () => {
  const estados: string[] = [];
  const cola = new ColaEjecucion(1, (e: EventoProgreso) => estados.push(`${e.id}:${e.estado}`));
  expect(await cola.add('x', async () => 42)).toBe(42);
  expect(estados).toEqual(['x:en_cola', 'x:ejecutando', 'x:terminado']);
});

test('una tarea que falla se informa como error y no frena la cola', async () => {
  const estados: string[] = [];
  const cola = new ColaEjecucion(1, (e: EventoProgreso) => estados.push(`${e.id}:${e.estado}`));
  const a = cola.add('a', async () => {
    throw new Error('boom');
  });
  const s = cola.add('s', () => {
    throw new Error('sincrónico'); // también se captura un error lanzado antes de devolver la promesa
  });
  const b = cola.add('b', async () => 'ok');
  await expect(a).rejects.toThrow('boom');
  await expect(s).rejects.toThrow('sincrónico');
  expect(await b).toBe('ok');
  expect(estados).toContain('a:error');
  expect(estados).toContain('s:error');
  expect(cola.ejecutando).toBe(0);
});

test('cancelarTodo corta lo que corre y lo que espera; un id inexistente devuelve false', async () => {
  const estados: string[] = [];
  const cola = new ColaEjecucion(1, (e: EventoProgreso) => estados.push(`${e.id}:${e.estado}`));
  const a = cola.add('a', ({ signal }) => dormir(5_000, signal));
  const b = cola.add('b', async () => 1);
  await dormir(10); // que "a" ya haya arrancado
  expect(cola.cancelar('nada')).toBe(false);
  const resultados = Promise.allSettled([a, b]);
  cola.cancelarTodo();
  const [ra, rb] = await resultados;
  expect(ra?.status).toBe('rejected');
  expect(rb?.status).toBe('rejected');
  expect((ra as PromiseRejectedResult).reason).toBeInstanceOf(ErrorAbortado);
  expect((rb as PromiseRejectedResult).reason).toBeInstanceOf(ErrorAbortado);
  expect(estados).toContain('a:cancelado');
  expect(estados).toContain('b:cancelado');
  expect(cola.pendientes).toBe(0);
  expect(cola.ejecutando).toBe(0);
});

test('el id se puede reutilizar cuando el trabajo anterior ya terminó', async () => {
  const cola = new ColaEjecucion(1);
  expect(await cola.add('x', async () => 1)).toBe(1);
  await dormir(0); // el id se libera en el `finally`, un instante después de resolver la promesa
  expect(await cola.add('x', async () => 2)).toBe(2);
});