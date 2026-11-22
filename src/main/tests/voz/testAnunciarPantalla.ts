import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { caso, dichos, esperar, resumen } from './entornoVoz';
import { activarModoVoz, configurarLector, usarVozPropia } from '../../../renderer/src/voz/narrador';
import { AnunciarPantalla } from '../../../renderer/src/voz/anunciarPantalla';

// Prueba que al cambiar de pantalla Syntra diga dónde estás y el foco pase al contenido.
// CP-17 · Anuncio de pantalla y foco en el contenido (partición de equivalencias)
// Se corre con: npx tsx src/main/tests/voz/testAnunciarPantalla.ts

// Abre Syntra en una ruta, con un <main> como el de la plantilla.
async function abrir(ruta: string): Promise<HTMLElement> {
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
  document.body.innerHTML = '<nav><button>Material</button></nav><main>Contenido</main><div id="raiz"></div>';
  const raiz = createRoot(document.getElementById('raiz')!);
  await act(async () =>
    raiz.render(createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(AnunciarPantalla))),
  );
  await esperar();
  return document.querySelector('main')!;
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Al entrar a Material dice "Material de estudio"',
    'Material de estudio', async () => {
      await abrir('/material');
      return dichos.join(', ');
    });

  await caso(2, 'Paso 2 · Una ruta con id usa el nombre de su sección',
    'Flashcards', async () => {
      await abrir('/flashcards/3/estudiar');
      return dichos.join(', ');
    });

  await caso(3, 'Paso 3 · En el inicio de sesión dice "Inicio de sesión"',
    'Inicio de sesión', async () => {
      await abrir('/');
      return dichos.join(', ');
    });

  await caso(4, 'Paso 4 · En una sección sin voz avisa que no está disponible',
    'Esta sección no está disponible con la voz de Syntra. Con Tab llegás al menú para ir a otra.', async () => {
      await abrir('/estadisticas');
      return dichos.join(', ');
    });

  await caso(5, 'Paso 5 · El foco pasa al contenido (main) y no queda en la barra lateral',
    'foco en main | tabindex -1', async () => {
      const contenido = await abrir('/horarios');
      return `${document.activeElement === contenido ? 'foco en main' : 'foco en otro lado'} | tabindex ${contenido.tabIndex}`;
    });

  resumen();
  process.exit();
}

void main();
