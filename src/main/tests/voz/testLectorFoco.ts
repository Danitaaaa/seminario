import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { caso, dichos, enfocar, esperar, resumen } from './entornoVoz';
import { activarModoVoz, configurarLector, usarVozPropia } from '../../../renderer/src/voz/narrador';
import { LectorFoco } from '../../../renderer/src/voz/lectorFoco';

// Prueba que Syntra diga a qué se llegó con Tab: botones, enlaces, carpetas, casillas.
// CP-16 · Lectura del elemento enfocado con Tab (partición de equivalencias)
// Se corre con: npx tsx src/main/tests/voz/testLectorFoco.ts

async function montar(html: string): Promise<void> {
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
  document.body.innerHTML = `${html}<div id="raiz"></div>`;
  const raiz = createRoot(document.getElementById('raiz')!);
  await act(async () => raiz.render(createElement(LectorFoco)));
}

async function decir(selector: string): Promise<string> {
  enfocar(document.querySelector<HTMLElement>(selector)!);
  await esperar();
  return dichos.join(', ') || 'nada';
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Un botón se dice con su texto y "botón"',
    'Leer en voz alta, botón', async () => {
      await montar('<button>Leer en voz alta</button>');
      return decir('button');
    });

  await caso(2, 'Paso 2 · Un enlace se dice con su texto y "enlace"',
    'Volver a mis mazos, enlace', async () => {
      await montar('<a href="#/flashcards">Volver a mis mazos</a>');
      return decir('a');
    });

  await caso(3, 'Paso 3 · Una carpeta de Material se dice con su aria-label (tipo y nombre)',
    'Carpeta Comunicación de datos', async () => {
      await montar('<div tabindex="0" aria-label="Carpeta Comunicación de datos"><span>Comunicación de datos</span></div>');
      return decir('div[tabindex]');
    });

  await caso(4, 'Paso 4 · Un botón con solo ícono se dice con el alt de la imagen',
    'Más acciones, botón', async () => {
      await montar('<button><img alt="Más acciones"></button>');
      return decir('button');
    });

  await caso(5, 'Paso 5 · Una casilla dice su nombre y si está marcada',
    'Seleccionar mazo Álgebra, marcada', async () => {
      await montar('<input type="checkbox" checked aria-label="Seleccionar mazo Álgebra">');
      return decir('input');
    });

  await caso(6, 'Paso 6 · No lee los campos de texto (los lee EcoTeclado) ni el contenido entero de la pantalla',
    'nada', async () => {
      await montar('<main tabindex="-1"><input type="text" aria-label="Buscar"><p>Mucho texto</p></main>');
      enfocar(document.querySelector('input')!);
      return decir('main');
    });

  await caso(7, 'Paso 7 · Con NVDA hablando, Syntra no lee el foco',
    'nada', async () => {
      await montar('<button>Cerrar</button>');
      configurarLector(true);
      return decir('button');
    });

  resumen();
  process.exit();
}

void main();
