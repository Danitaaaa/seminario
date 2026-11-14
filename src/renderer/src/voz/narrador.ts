type Oyente = (texto: string) => void;

const CLAVE_VELOCIDAD = 'pref:vozVelocidad';
const oyentes = new Set<Oyente>();

let velocidad = leerVelocidad();
let lectorActivo = false; // NUEVO: true si NVDA, JAWS o el Narrador están prendidos

function leerVelocidad(): number {
  try {
    const guardada = Number(localStorage.getItem(CLAVE_VELOCIDAD));
    return guardada >= 0.5 && guardada <= 2 ? guardada : 1;
  } catch {
    return 1;
  }
}

// Voz de mujer (Laura) para que se distinga de NVDA, que usa voz de hombre.
// Chromium carga las voces de a poco: al principio getVoices() viene vacío y se usaba la voz por defecto.
let voces = speechSynthesis.getVoices();
speechSynthesis.addEventListener('voiceschanged', () => {
  voces = speechSynthesis.getVoices();
});

function vozEnEspanol(): SpeechSynthesisVoice | undefined {
  return (
    voces.find((v) => v.name.includes('Laura')) ??
    voces.find((v) => v.lang === 'es-AR') ??
    voces.find((v) => v.lang.startsWith('es'))
  );
}

// NUEVO: el Anunciador llama a esto cuando main avisa si hay lector de pantalla.
export function configurarLector(activo: boolean): void {
  lectorActivo = activo;
}

// true cuando la persona durmió a NVDA para que la guíe la voz de Syntra.
let vozPropia = false;

export function usarVozPropia(si: boolean): void {
  vozPropia = si;
}

// true si NVDA, JAWS o el Narrador están corriendo (aunque NVDA esté en modo silencioso).
export function lectorPrendido(): boolean {
  return lectorActivo;
}

export function hayLector(): boolean {
  return lectorActivo && !vozPropia;
}

// false cuando el usuario eligió no usar la voz: Syntra no dice nada.
// Arranca con lo que eligió el usuario con sesión abierta (si se abre la app ya logueado).
let modoVoz = leerModoVoz();

function leerModoVoz(): boolean {
  try {
    const delUsuario = localStorage.getItem(`syntra:modoVoz:${localStorage.getItem('usuarioId')}`);
    if (delUsuario !== null) return delUsuario !== 'no';
    return localStorage.getItem('syntra.modoVoz') !== 'false';
  } catch {
    return true;
  }
}

export function activarModoVoz(si: boolean): void {
  modoVoz = si;
}

// Secciones que no son accesibles por voz: ahí Syntra no lee nada.
const SECCIONES_SIN_VOZ = ['/proyectos', '/estadisticas'];

export function esSeccionSinVoz(ruta: string): boolean {
  return SECCIONES_SIN_VOZ.some((s) => ruta === s || ruta.startsWith(`${s}/`));
}

const rutaActual = () => window.location.hash.replace(/^#/, '') || '/';

let pendiente: ReturnType<typeof setTimeout> | undefined;
let turno = 0;

// Dice un texto: con la voz de Syntra o, si hay lector de pantalla, por la región aria-live.
// Corta lo que se estaba diciendo. alTerminar se llama solo si nadie la interrumpió.
// avisoSeccion: solo para avisar al entrar que la sección no se lee por voz.
export function hablar(texto: string, alTerminar?: () => void, avisoSeccion = false): void {
  if (!modoVoz || (!avisoSeccion && esSeccionSinVoz(rutaActual()))) return;
  const miTurno = ++turno;
  clearTimeout(pendiente);
  speechSynthesis.cancel();

  if (!hayLector()) {
    // Chromium a veces descarta una frase que se pide justo después de cancel()
    // o se queda trabado "hablando": se espera un instante y se lo destraba con resume().
    pendiente = setTimeout(() => {
      const frase = new SpeechSynthesisUtterance(texto);
      frase.lang = 'es-AR';
      frase.rate = velocidad;
      const voz = vozEnEspanol();
      if (voz) frase.voice = voz;
      if (alTerminar) frase.onend = () => miTurno === turno && alTerminar();
      speechSynthesis.resume();
      speechSynthesis.speak(frase);
    }, 50);
    return;
  }

  // Solo si hay lector: el texto va a la región aria-live y lo dice NVDA (nunca los dos a la vez).
  oyentes.forEach((oyente) => oyente(texto));
}

export function detener(): void {
  turno++;
  clearTimeout(pendiente);
  speechSynthesis.cancel();
}

export function estaHablando(): boolean {
  return speechSynthesis.speaking;
}

export function cambiarVelocidad(nueva: number): void {
  velocidad = Math.min(2, Math.max(0.5, nueva));
  try {
    localStorage.setItem(CLAVE_VELOCIDAD, String(velocidad));
  } catch {
    // Sin almacenamiento: la velocidad dura hasta cerrar la app.
  }
}

export function obtenerVelocidad(): number {
  return velocidad;
}

// Devuelve la función para dejar de escuchar (sirve directo como cleanup de useEffect).
export function escucharAnuncios(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}