import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { caso, dichos, enfocar, esperar, estado, resumen, tecla } from './entornoVoz';
import { activarModoVoz, configurarLector, usarVozPropia } from '../../../renderer/src/voz/narrador';
import { EcoTeclado } from '../../../renderer/src/voz/ecoTeclado';

// Prueba el eco de teclado: Syntra dice lo que se escribe en los campos.
// CP-15 · Eco de teclado en los campos (partición de equivalencias)
// Se corre con: npx tsx src/main/tests/voz/testEcoTeclado.ts

// Pantalla de inicio de sesión de prueba, con EcoTeclado montado.
async function montar(): Promise<{ correo: HTMLInputElement; clave: HTMLInputElement }> {
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
  document.body.innerHTML = `
    <label for="correo">Correo</label><input id="correo" type="email">
    <input id="clave" type="password" aria-label="Contraseña">
    <div id="raiz"></div>`;
  const raiz = createRoot(document.getElementById('raiz')!);
  await act(async () => raiz.render(createElement(EcoTeclado, { activo: true })));
  return {
    correo: document.getElementById('correo') as HTMLInputElement,
    clave: document.getElementById('clave') as HTMLInputElement,
  };
}

// Escribe una tecla: la anuncia y después la agrega al campo (como el navegador).
function escribir(campo: HTMLInputElement, letra: string): void {
  tecla(letra, {}, campo);
  campo.value += letra;
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Al entrar a un campo vacío dice su nombre y "vacío"',
    'Correo, vacío', async () => {
      const { correo } = await montar();
      enfocar(correo);
      await esperar();
      return dichos.join(', ');
    });

  await caso(2, 'Paso 2 · Cada letra se dice al escribirla (mayúsculas y símbolos con nombre)',
    'd, A mayúscula, arroba, punto', async () => {
      const { correo } = await montar();
      for (const letra of ['d', 'A', '@', '.']) {
        escribir(correo, letra);
        await esperar();
      }
      return dichos.join(', ');
    });

  await caso(3, 'Paso 3 · Espacio dice la palabra que se terminó de escribir',
    'hola', async () => {
      const { correo } = await montar();
      correo.value = 'hola';
      tecla(' ', {}, correo);
      await esperar();
      return dichos.join(', ');
    });

  await caso(4, 'Paso 4 · Borrar dice la letra borrada',
    'Borrado a', async () => {
      const { correo } = await montar();
      correo.value = 'hola';
      tecla('Backspace', {}, correo);
      await esperar();
      return dichos.join(', ');
    });

  await caso(5, 'Paso 5 · En la contraseña no se dicen las letras: "Asterisco" y la cantidad de caracteres',
    'Asterisco, Borrado, Contraseña, 3 caracteres', async () => {
      const { clave } = await montar();
      clave.value = 'abc';
      tecla('x', {}, clave);
      await esperar();
      tecla('Backspace', {}, clave);
      await esperar();
      enfocar(clave);
      await esperar();
      return dichos.join(', ');
    });

  await caso(6, 'Paso 6 · Ctrl+L vuelve a leer el campo completo',
    'Correo, dana@utn.edu', async () => {
      const { correo } = await montar();
      correo.value = 'dana@utn.edu';
      tecla('l', { ctrlKey: true }, correo);
      await esperar();
      return dichos.join(', ');
    });

  await caso(7, 'Paso 7 · Con NVDA prendido no hay eco (NVDA ya tiene el suyo)',
    'nada', async () => {
      const { correo } = await montar();
      estado.lector = true;
      enfocar(correo);
      await esperar();
      escribir(correo, 'd');
      await esperar();
      return dichos.join(', ') || 'nada';
    });

  resumen();
  process.exit();
}

void main();
