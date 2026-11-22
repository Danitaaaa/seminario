import { caso, dichos, esperar, resumen, terminarFrase } from './entornoVoz';
import { activarModoVoz, configurarLector, usarVozPropia } from '../../../renderer/src/voz/narrador';
import {
  anteriorTitulo, detenerLectura, empezarLectura, pausarLectura, seguirLectura, siguienteTitulo, type Bloque,
} from '../../../renderer/src/voz/lectorDocumento';

// Prueba "Leer en voz alta" del visor: lectura por oraciones, pausa y cambio de página con las flechas.
// CP-18 · Leer en voz alta un PDF y cambiar de página (valores límite)
// Se corre con: npx tsx src/main/tests/voz/testLectorDocumento.ts

// Un PDF de 3 páginas, como lo arma extraerTexto (cada página es un título).
const PDF: Bloque[] = [
  { texto: 'Página 1', esTitulo: true }, { texto: 'Uno. Dos.', esTitulo: false },
  { texto: 'Página 2', esTitulo: true }, { texto: 'Tres.', esTitulo: false },
  { texto: 'Página 3', esTitulo: true }, { texto: 'Cuatro.', esTitulo: false },
];

function reiniciar(): void {
  detenerLectura();
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
}

// La voz termina la frase actual y pasa a la siguiente.
async function avanzar(veces = 1): Promise<void> {
  for (let i = 0; i < veces; i++) {
    await esperar();
    terminarFrase();
  }
  await esperar();
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Lee todo en orden: títulos con "Título:" y los párrafos de a una oración',
    'Título: Introducción, Primera idea., Segunda idea., Fin del documento.', async () => {
      reiniciar();
      empezarLectura([
        { texto: 'Introducción', esTitulo: true },
        { texto: 'Primera idea. Segunda idea.', esTitulo: false },
      ]);
      await avanzar(3);
      return dichos.join(', ');
    });

  await caso(2, 'Paso 2 · Un archivo sin texto lo avisa',
    'Este archivo no tiene texto para leer.', async () => {
      reiniciar();
      empezarLectura([{ texto: '   ', esTitulo: false }]);
      await esperar();
      return dichos.join(', ');
    });

  await caso(3, 'Paso 3 · Pausar dice "Pausado" y seguir retoma la misma oración',
    'Título: Página 1, Uno., Pausado, Uno.', async () => {
      reiniciar();
      empezarLectura(PDF);
      await avanzar();
      pausarLectura();
      await esperar();
      seguirLectura();
      await esperar();
      return dichos.join(', ');
    });

  await caso(4, 'Paso 4 · Flecha derecha: pasa a la página siguiente y sigue leyendo',
    'Título: Página 1, Título: Página 2, Tres.', async () => {
      reiniciar();
      empezarLectura(PDF);
      await esperar();
      siguienteTitulo();
      await avanzar();
      return dichos.join(', ');
    });

  await caso(5, 'Paso 5 · Flecha izquierda: desde la página 2 vuelve a la página 1',
    'Título: Página 1', async () => {
      reiniciar();
      empezarLectura(PDF);
      await esperar();
      siguienteTitulo();
      await avanzar();
      dichos.length = 0;
      anteriorTitulo();
      await esperar();
      return dichos.join(', ');
    });

  await caso(6, 'Paso 6 · En la última página, flecha derecha avisa y sigue leyendo donde estaba',
    'No hay más páginas., Cuatro.', async () => {
      reiniciar();
      empezarLectura(PDF);
      await esperar();
      siguienteTitulo();
      await esperar();
      siguienteTitulo();
      await avanzar();
      dichos.length = 0;
      siguienteTitulo();
      await avanzar();
      return dichos.join(', ');
    });

  await caso(7, 'Paso 7 · En la primera página, flecha izquierda avisa "Es la primera página."',
    'Es la primera página., Título: Página 1', async () => {
      reiniciar();
      empezarLectura(PDF);
      await esperar();
      dichos.length = 0;
      anteriorTitulo();
      await avanzar();
      return dichos.join(', ');
    });

  await caso(8, 'Paso 8 · Detener (al cerrar el visor) corta la lectura y no se puede seguir',
    'nada', async () => {
      reiniciar();
      empezarLectura(PDF);
      await esperar();
      detenerLectura();
      dichos.length = 0;
      seguirLectura();
      await esperar();
      return dichos.join(', ') || 'nada';
    });

  resumen();
}

void main();
