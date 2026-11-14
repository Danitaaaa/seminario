import { activarModoVoz, configurarLector, hablar, hayLector, usarVozPropia } from './narrador';

const INDICACIONES =
  'Bienvenida a Syntra. Podés ir a Material, Flashcards, Sesiones, Calendario, Horarios, Métodos y Notificaciones. Con Tab recorrés la pantalla.';

let yaSaludo = false;

// Avisa al VoiceProvider (cartel y Ctrl+Alt+V) la elección del usuario que entró.
export const EVENTO_MODO_VOZ = 'syntra:modoVoz';

// Lo que se respondió en el cartel de bienvenida en esta compu (sin respuesta: con voz).
function modoDelEquipo(): boolean {
  try {
    return localStorage.getItem('syntra.modoVoz') !== 'false';
  } catch {
    return true;
  }
}

// Las elecciones se guardan por usuario: cada pregunta se hace una sola vez.
const claveModoVoz = () => `syntra:modoVoz:${localStorage.getItem('usuarioId')}`;

function leerEleccion(clave: string): boolean | null {
  try {
    const valor = localStorage.getItem(clave);
    return valor === null ? null : valor === 'si';
  } catch {
    return null;
  }
}

function guardarEleccion(clave: string, si: boolean): void {
  try {
    localStorage.setItem(clave, si ? 'si' : 'no');
  } catch {
    // Sin almacenamiento: se vuelve a preguntar la próxima vez.
  }
}

// Al volver al inicio de sesión: el próximo usuario arranca de cero.
export function reiniciarBienvenida(): void {
  yaSaludo = false;
  // En el login vale la respuesta del cartel de bienvenida, no la del usuario que salió.
  activarModoVoz(modoDelEquipo());
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_MODO_VOZ, { detail: modoDelEquipo() }));
}

// La primera vez que se llega al inicio: si hay NVDA, ofrece dormirlo para que guíe la voz de Syntra.
export async function darBienvenida(): Promise<void> {
  if (yaSaludo) return hablar('Inicio');
  yaSaludo = true;

  // Se vuelve a preguntar: si Windows avisó tarde de NVDA, Syntra hablaría encima.
  configurarLector(await window.api.lectorPantallaActivo().catch(() => hayLector()));

  // Primero: si este usuario usa Syntra con voz. La primera vez hereda lo que se respondió
  // en el cartel de bienvenida, sin volver a preguntar. Ctrl+Alt+V lo cambia.
  let modoVoz = leerEleccion(claveModoVoz());
  if (modoVoz === null) {
    modoVoz = modoDelEquipo();
    guardarEleccion(claveModoVoz(), modoVoz);
  }
  activarModoVoz(modoVoz);
  usarVozPropia(modoVoz);
  window.dispatchEvent(new CustomEvent<boolean>(EVENTO_MODO_VOZ, { detail: modoVoz }));
  if (modoVoz) hablar(INDICACIONES);
}
