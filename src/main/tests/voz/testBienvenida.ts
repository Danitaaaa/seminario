import { caso, dichos, esperar, estado, resumen } from './entornoVoz';
import { configurarLector, escucharAnuncios, hayLector, modoVozActivo } from '../../../renderer/src/voz/narrador';
import { EVENTO_MODO_VOZ, darBienvenida, reiniciarBienvenida } from '../../../renderer/src/voz/bienvenida';

// Prueba la bienvenida al entrar al inicio: la elección de voz se hace una sola vez por usuario.
// CP-13 · Elección de la voz al entrar, una sola vez por usuario (tabla de decisión)
// Se corre con: npx tsx src/main/tests/voz/testBienvenida.ts

const INDICACIONES =
  'Bienvenida a Syntra. Podés ir a Material, Flashcards, Sesiones, Calendario, Horarios, Métodos y Notificaciones. Con Tab recorrés la pantalla.';

// Entra un usuario: localStorage limpio (salvo lo que se pase) y la bienvenida sin dar.
function entrar(usuarioId: string, guardado: Record<string, string> = {}): void {
  localStorage.clear();
  localStorage.setItem('usuarioId', usuarioId);
  for (const [clave, valor] of Object.entries(guardado)) localStorage.setItem(clave, valor);
  configurarLector(false);
  reiniciarBienvenida();
  localStorage.setItem('usuarioId', usuarioId);
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Usuario nuevo: hereda "con voz" del cartel de bienvenida, da las indicaciones y lo guarda',
    `${INDICACIONES} | guardado: si`, async () => {
      entrar('7');
      await darBienvenida();
      await esperar();
      return `${dichos.join(', ')} | guardado: ${localStorage.getItem('syntra:modoVoz:7')}`;
    });

  await caso(2, 'Paso 2 · Usuario nuevo con el cartel respondido "sin voz": Syntra no habla y guarda "no"',
    'nada | modo voz: false | guardado: no', async () => {
      entrar('8', { 'syntra.modoVoz': 'false' });
      await darBienvenida();
      await esperar();
      return `${dichos.join(', ') || 'nada'} | modo voz: ${modoVozActivo()} | guardado: ${localStorage.getItem('syntra:modoVoz:8')}`;
    });

  await caso(3, 'Paso 3 · Usuario que ya eligió voz: vale su elección aunque el cartel diga "sin voz"',
    `${INDICACIONES}`, async () => {
      entrar('9', { 'syntra.modoVoz': 'false', 'syntra:modoVoz:9': 'si' });
      await darBienvenida();
      await esperar();
      return dichos.join(', ');
    });

  await caso(4, 'Paso 4 · Al volver al inicio en la misma sesión solo dice "Inicio"',
    'Inicio', async () => {
      entrar('7');
      await darBienvenida();
      await esperar();
      dichos.length = 0;
      await darBienvenida();
      await esperar();
      return dichos.join(', ');
    });

  await caso(5, 'Paso 5 · Con NVDA prendido y voz elegida, habla Syntra (no NVDA)',
    `lector: nada | Syntra: ${INDICACIONES} | hay lector: false`, async () => {
      entrar('7');
      estado.lector = true;
      const alLector: string[] = [];
      const dejar = escucharAnuncios((texto) => alLector.push(texto));
      await darBienvenida();
      await esperar();
      dejar();
      return `lector: ${alLector.join(', ') || 'nada'} | Syntra: ${dichos.join(', ')} | hay lector: ${hayLector()}`;
    });

  await caso(6, 'Paso 6 · Al cerrar sesión vuelve a lo del cartel y avisa con el evento syntra:modoVoz',
    'modo voz: false | evento: false', async () => {
      entrar('9', { 'syntra.modoVoz': 'false', 'syntra:modoVoz:9': 'si' });
      await darBienvenida();
      let avisado: boolean | null = null;
      const escuchar = (e: Event) => { avisado = (e as CustomEvent<boolean>).detail; };
      window.addEventListener(EVENTO_MODO_VOZ, escuchar);
      reiniciarBienvenida();
      window.removeEventListener(EVENTO_MODO_VOZ, escuchar);
      return `modo voz: ${modoVozActivo()} | evento: ${avisado}`;
    });

  resumen();
}

void main();
