let contexto: AudioContext | null = null;
let oscilador: OscillatorNode | null = null;
let volumen: GainNode | null = null;

export function iniciar(): void {
  detener();

  if (typeof window.AudioContext === 'undefined') {
    console.error('AudioContext no está disponible para la guía facial.');
    return;
  }

  try {
    contexto = new window.AudioContext();
    oscilador = contexto.createOscillator();
    volumen = contexto.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = 220;
    volumen.gain.value = 0.035;
    oscilador.connect(volumen);
    volumen.connect(contexto.destination);
    oscilador.start();

    if (contexto.state === 'suspended') {
      void contexto.resume().catch((error: unknown) => {
        console.error('No se pudo reanudar AudioContext para la guía facial.', error);
      });
    }
  } catch (error) {
    console.error('No se pudo iniciar el sonido de la guía facial.', error);
    detener();
  }
}

export function actualizar(cercania: number): void {
  if (!contexto || !oscilador) return;

  const valorLimitado = Math.min(1, Math.max(0, cercania));
  oscilador.frequency.setTargetAtTime(
    220 + valorLimitado * 880,
    contexto.currentTime,
    0.05,
  );
}

export function detener(): void {
  const contextoActual = contexto;
  const osciladorActual = oscilador;
  const volumenActual = volumen;

  contexto = null;
  oscilador = null;
  volumen = null;

  if (osciladorActual) {
    osciladorActual.stop();
    osciladorActual.disconnect();
  }
  volumenActual?.disconnect();

  if (contextoActual && contextoActual.state !== 'closed') {
    void contextoActual.close().catch((error: unknown) => {
      console.error('No se pudo cerrar AudioContext de la guía facial.', error);
    });
  }
}
