import { caso, dichos, esperar, irA, resumen, terminarFrase, ultima } from './entornoVoz';
import {
  activarModoVoz, cambiarVelocidad, configurarLector, escucharAnuncios, esSeccionSinVoz, hablar,
  obtenerVelocidad, usarVozPropia,
} from '../../../renderer/src/voz/narrador';

// Prueba la locución de Syntra: quién habla (Syntra o NVDA), cuándo se calla y la velocidad.
// CP-12 · Quién habla: Syntra o el lector de pantalla (tabla de decisión)
// Se corre con: npx tsx src/main/tests/voz/testNarrador.ts

function reiniciar(): string[] {
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
  const alLector: string[] = [];
  escucharAnuncios((texto) => alLector.push(texto));
  return alLector;
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · Sin lector de pantalla, habla Syntra con la voz Laura',
    'Hola | Microsoft Laura - Spanish (Spain) | es-AR', async () => {
      reiniciar();
      hablar('Hola');
      await esperar();
      const frase = ultima();
      return `${dichos.join(',')} | ${frase?.voice?.name} | ${frase?.lang}`;
    });

  await caso(2, 'Paso 2 · Con NVDA prendido, el texto va al lector y Syntra no habla',
    'lector: Hola | Syntra: nada', async () => {
      const alLector = reiniciar();
      configurarLector(true);
      hablar('Hola');
      await esperar();
      return `lector: ${alLector.join(',')} | Syntra: ${dichos.join(',') || 'nada'}`;
    });

  await caso(3, 'Paso 3 · Con NVDA en modo silencioso y la voz de Syntra elegida, habla solo Syntra',
    'lector: nada | Syntra: Hola', async () => {
      const alLector = reiniciar();
      configurarLector(true);
      usarVozPropia(true);
      hablar('Hola');
      await esperar();
      return `lector: ${alLector.join(',') || 'nada'} | Syntra: ${dichos.join(',')}`;
    });

  await caso(4, 'Paso 4 · Con el modo voz desactivado, Syntra no dice nada',
    'nada', async () => {
      reiniciar();
      activarModoVoz(false);
      hablar('Hola');
      await esperar();
      return dichos.join(',') || 'nada';
    });

  await caso(5, 'Paso 5 · En una sección sin voz solo se dice el aviso de la sección',
    'Esta sección no está disponible', async () => {
      reiniciar();
      irA('/proyectos/3');
      hablar('Proyecto Física');
      hablar('Esta sección no está disponible', undefined, true);
      await esperar();
      return dichos.join(',');
    });

  await caso(6, 'Paso 6 · Secciones sin voz: Proyectos, Estadísticas, Cronograma y Materias (con sus subrutas)',
    'sin voz: /proyectos/3, /estadisticas, /cronograma, /materias | con voz: /material, /flashcards/2', () => {
      const rutas = ['/proyectos/3', '/estadisticas', '/cronograma', '/materias', '/material', '/flashcards/2'];
      return `sin voz: ${rutas.filter(esSeccionSinVoz).join(', ')} | con voz: ${rutas.filter((r) => !esSeccionSinVoz(r)).join(', ')}`;
    });

  await caso(7, 'Paso 7 · Una frase nueva corta la anterior: solo se dice la última',
    'Material de estudio', async () => {
      reiniciar();
      hablar('Inicio');
      hablar('Material de estudio');
      await esperar();
      return dichos.join(',');
    });

  await caso(8, 'Paso 8 · Al terminar una frase se avisa, salvo que otra la haya interrumpido',
    'sin interrumpir: avisó | interrumpida: no avisó', async () => {
      reiniciar();
      let avisos = 0;
      hablar('Primera', () => avisos++);
      await esperar();
      terminarFrase();
      const sinInterrumpir = avisos === 1 ? 'avisó' : 'no avisó';

      hablar('Segunda', () => avisos++);
      await esperar();
      const segunda = ultima();
      hablar('Tercera');
      await esperar();
      segunda?.onend?.();
      return `sin interrumpir: ${sinInterrumpir} | interrumpida: ${avisos === 1 ? 'no avisó' : 'avisó'}`;
    });

  await caso(9, 'Paso 9 · La velocidad queda entre 0,5 y 2 y se guarda',
    '2 | 0.5 | guardada 0.5 | frase a 0.5', async () => {
      reiniciar();
      cambiarVelocidad(5);
      const maxima = obtenerVelocidad();
      cambiarVelocidad(0.1);
      hablar('Lento');
      await esperar();
      return `${maxima} | ${obtenerVelocidad()} | guardada ${localStorage.getItem('pref:vozVelocidad')} | frase a ${ultima()?.rate}`;
    });

  resumen();
}

void main();
