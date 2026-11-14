import { test, expect, afterAll } from 'vitest';
import { RouterModelos, type EventoRouter } from '../../logicaNoPersistente/ia/routerModelos';
import { ErrorProveedor, ErrorRouter } from '../../logicaNoPersistente/ia/errores';
import type { PedidoCrudo, ProveedorModelo } from '../../logicaNoPersistente/ia/tipos';
import { falso, pedido, router, cadenas } from './ayudas';

// ---------- router ----------
test('usa el principal si anda', async () => {
  const luna = falso('luna', 'online', ['{"x":1}']);
  const gem = falso('gemini', 'online', ['{"x":2}']);
  const r = await router([luna, gem]).generar('resumen', pedido());
  expect(r.proveedor).toBe('luna');
  expect(gem.llamadas).toBe(0);
});

test('cae a Gemini si GptMini da 429, y a Gemma si ambos fallan', async () => {
  const luna = falso('luna', 'online', [new ErrorProveedor('cuota', 'luna', 'x')]);
  const gem = falso('gemini', 'online', [new ErrorProveedor('red', 'gemini', 'x')]);
  const gemma = falso('gemma', 'local', ['{"x":3}']);
  const r = await router([luna, gem, gemma]).generar('resumen', pedido());
  expect(r.proveedor).toBe('gemma');
});

test('sin internet salta directo a lo local', async () => {
  const luna = falso('luna', 'online', ['{"x":1}']);
  const gemma = falso('gemma', 'local', ['{"x":3}']);
  const ev: EventoRouter[] = [];
  const r = await router([luna, gemma], false, ev).generar('resumen', pedido());
  expect(r.proveedor).toBe('gemma');
  expect(luna.llamadas).toBe(0);
  expect(ev.some((e) => e.tipo === 'omitido' && e.proveedor === 'luna')).toBe(true);
});

test('reintenta si el JSON no valida y lo logra', async () => {
  const luna = falso('luna', 'online', ['no es json', '```json\n{"x":5}\n```']);
  const r = await router([luna]).generar('resumen', pedido());
  expect(r.intentos).toBe(2);
  expect(r.dato.x).toBe(5);
});

test('JSON siempre inválido → pasa al siguiente proveedor', async () => {
  const luna = falso('luna', 'online', ['{"x":"mal"}']);
  const gemma = falso('gemma', 'local', ['{"x":9}']);
  const r = await router([luna, gemma]).generar('resumen', pedido());
  expect(luna.llamadas).toBe(2);
  expect(r.proveedor).toBe('gemma');
});

test('si todos fallan lanza ErrorRouter con el detalle', async () => {
  const luna = falso('luna', 'online', [new ErrorProveedor('auth', 'luna', 'x')]);
  const err = await router([luna]).generar('resumen', pedido()).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ErrorRouter);
  expect((err as ErrorRouter).fallos[0]?.causa).toBe('auth');
});

test('cancelar NO activa el respaldo', async () => {
  const ac = new AbortController();
  const luna = falso('luna', 'online', [Object.assign(new Error('abort'), { name: 'AbortError' })]);
  const gemma = falso('gemma', 'local', ['{"x":3}']);
  ac.abort();
  await expect(router([luna, gemma]).generar('resumen', pedido(ac.signal))).rejects.toThrow();
  expect(gemma.llamadas).toBe(0);
});


// ---------- router: timeout, enfriamiento, probar ----------
const colgado = (id: string): ProveedorModelo & { llamadas: number } => {
  const p = {
    id, tipo: 'online' as const, llamadas: 0, disponible: async () => true,
    generarJson: (pd: PedidoCrudo) => { p.llamadas++; return new Promise<string>((_, rej) => pd.signal?.addEventListener('abort', () => rej(pd.signal!.reason))); },
  };
  return p;
};
const routerT = (ps: ProveedorModelo[], extra: object = {}) =>
  new RouterModelos(ps, { cadenas, hayInternet: () => true, timeoutMs: { online: 30, local: 30 }, ...extra });

test('timeout: un proveedor colgado no bloquea, se pasa al respaldo', async () => {
  const luna = colgado('luna');
  const gemma = falso('gemma', 'local', ['{"x":3}']);
  const r = await routerT([luna, gemma]).generar('resumen', pedido());
  expect(r.proveedor).toBe('gemma');
});

test('timeout NO se confunde con cancelación del usuario', async () => {
  const ac = new AbortController();
  const luna = colgado('luna');
  const rt = routerT([luna, falso('gemma', 'local', ['{"x":1}'])]);
  const p = rt.generar('resumen', pedido(ac.signal));
  setTimeout(() => ac.abort(), 5);
  await expect(p).rejects.toMatchObject({ name: 'AbortError' });
});

test('enfriamiento: tras un 429 no vuelve a probar Luna hasta que pasa el tiempo', async () => {
  let t = 1000;
  const luna = falso('luna', 'online', [new ErrorProveedor('cuota', 'luna', '429'), '{"x":1}']);
  const gemma = falso('gemma', 'local', ['{"x":3}']);
  const rt = routerT([luna, gemma], { enfriamientoMs: 60_000, ahora: () => t });
  expect((await rt.generar('resumen', pedido())).proveedor).toBe('gemma');
  expect((await rt.generar('resumen', pedido())).proveedor).toBe('gemma');
  expect(luna.llamadas).toBe(1); // la segunda vez ni lo intentó
  t += 61_000;
  expect((await rt.generar('resumen', pedido())).proveedor).toBe('luna'); // ya se puede reintentar
});

test('probar(): informa ok o la causa del fallo', async () => {
  const ok = falso('luna', 'online', ['{"ok":true}']);
  const mal = falso('gemini', 'online', [new ErrorProveedor('auth', 'gemini', '401')]);
  const rt = routerT([ok, mal]);
  expect((await rt.probar('luna')).ok).toBe(true);
  expect((await rt.probar('gemini')).causa).toEqual('auth');
});


// AbortSignal.timeout() no mantiene vivo el proceso: este timer evita que Node cierre antes de tiempo en los tests.
const vivo = setInterval(() => {}, 1000);
afterAll(() => clearInterval(vivo));
