import { caso, dichos, esperar, resumen, tecla } from './entornoVoz';
import { configurarLector, usarVozPropia, activarModoVoz } from '../../../renderer/src/voz/narrador';
import { confirmar, hayConfirmacionPendiente, responderConfirmacion } from '../../../renderer/src/voz/confirmacion';

// Prueba las confirmaciones por voz: Tab = sí, Escape = no.
// CP-14 · Confirmaciones por voz con Tab y Escape (partición de equivalencias)
// Se corre con: npx tsx src/main/tests/voz/testConfirmacion.ts

function reiniciar(): void {
  configurarLector(false);
  usarVozPropia(false);
  activarModoVoz(true);
  responderConfirmacion(false);
}

async function main(): Promise<void> {
  await caso(1, 'Paso 1 · La pregunta se dice con las instrucciones para responder',
    '¿Eliminar la carpeta? Decí sí o no. También podés apretar Tab para sí o Escape para no.', async () => {
      reiniciar();
      void confirmar('¿Eliminar la carpeta?');
      await esperar();
      responderConfirmacion(false);
      return dichos[0];
    });

  await caso(2, 'Paso 2 · Tab responde que sí y Syntra dice "Confirmado"',
    'true | Confirmado', async () => {
      reiniciar();
      const respuesta = confirmar('¿Eliminar la carpeta?');
      tecla('Tab');
      const si = await respuesta;
      await esperar();
      return `${si} | ${dichos.at(-1)}`;
    });

  await caso(3, 'Paso 3 · Escape responde que no y Syntra dice "Cancelado"',
    'false | Cancelado', async () => {
      reiniciar();
      const respuesta = confirmar('¿Eliminar la carpeta?');
      tecla('Escape');
      const si = await respuesta;
      await esperar();
      return `${si} | ${dichos.at(-1)}`;
    });

  await caso(4, 'Paso 4 · Otras teclas no responden: la pregunta sigue abierta',
    'sigue abierta', async () => {
      reiniciar();
      void confirmar('¿Eliminar la carpeta?');
      tecla('a');
      tecla('Enter');
      const abierta = hayConfirmacionPendiente() ? 'sigue abierta' : 'se cerró';
      responderConfirmacion(false);
      return abierta;
    });

  await caso(5, 'Paso 5 · Mientras pregunta, Tab no mueve el foco',
    'Tab bloqueado', () => {
      reiniciar();
      void confirmar('¿Eliminar la carpeta?');
      const evento = tecla('Tab');
      return evento.defaultPrevented ? 'Tab bloqueado' : 'Tab movió el foco';
    });

  await caso(6, 'Paso 6 · Una pregunta nueva cancela la anterior',
    'primera: false | segunda abierta', async () => {
      reiniciar();
      const primera = confirmar('¿Eliminar la carpeta?');
      void confirmar('¿Cerrar sesión?');
      const resultado = `primera: ${await primera} | ${hayConfirmacionPendiente() ? 'segunda abierta' : 'segunda cerrada'}`;
      responderConfirmacion(false);
      return resultado;
    });

  await caso(7, 'Paso 7 · El reconocimiento de voz puede responder que sí (responderConfirmacion)',
    'true | sin pregunta abierta', async () => {
      reiniciar();
      const respuesta = confirmar('¿Eliminar la carpeta?');
      responderConfirmacion(true);
      return `${await respuesta} | ${hayConfirmacionPendiente() ? 'con pregunta abierta' : 'sin pregunta abierta'}`;
    });

  await caso(8, 'Paso 8 · Después de responder, Tab vuelve a funcionar normal',
    'Tab libre', async () => {
      reiniciar();
      const respuesta = confirmar('¿Eliminar la carpeta?');
      tecla('Escape');
      await respuesta;
      return tecla('Tab').defaultPrevented ? 'Tab bloqueado' : 'Tab libre';
    });

  resumen();
}

void main();
