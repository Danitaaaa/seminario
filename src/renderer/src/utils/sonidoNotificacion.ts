// Sonido corto de aviso (dos notas suaves), armado con Web Audio: no necesita archivos.
let contexto: AudioContext | null = null;
let ultimo = 0;

export function sonarNotificacion(): void {
  // Si llegan varios avisos juntos, suena una sola vez.
  const ahora = Date.now();
  if (ahora - ultimo < 1500) return;
  ultimo = ahora;

  try {
    contexto ??= new AudioContext();
    const ctx = contexto;
    void ctx.resume();
    const inicio = ctx.currentTime;

    [880, 1318.5].forEach((frecuencia, i) => {
      const osc = ctx.createOscillator();
      const volumen = ctx.createGain();
      const t = inicio + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      volumen.gain.setValueAtTime(0.0001, t);
      volumen.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(volumen).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // Si el audio no está disponible, el aviso igual se muestra.
  }
}