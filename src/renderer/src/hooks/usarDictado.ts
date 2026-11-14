// Dictado: grabar con el micrófono y pasar la voz a texto con Whisper, en la compu y sin internet.
// La primera vez baja el modelo (~75 MB). Suena un tono al empezar y otro al terminar de grabar,
// así se puede usar sin mirar la pantalla.
import { useEffect, useRef, useState } from 'react';
import type { RespuestaDictado } from '../voz/dictado.worker';

export type EstadoDictado = 'inactivo' | 'preparando' | 'grabando' | 'transcribiendo';

const MUESTREO = 16_000; // Whisper trabaja con audio a 16 kHz
const MAXIMO_MS = 2 * 60 * 1000; // se corta solo a los 2 minutos
// La primera vez el worker tiene que cargar el modelo: se le da tiempo, pero no se queda cargando para siempre.
const ESPERA_TRANSCRIPCION_MS = 3 * 60 * 1000;

let worker: Worker | null = null;
let siguienteId = 0;

function obtenerWorker(): Worker {
  worker ??= new Worker(new URL('../voz/dictado.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

function transcribir(audio: Float32Array): Promise<string> {
  const id = ++siguienteId;
  const w = obtenerWorker();
  return new Promise((resolver, rechazar) => {
    const terminar = () => {
      clearTimeout(espera);
      w.removeEventListener('message', alResponder);
      w.removeEventListener('error', alFallar);
    };
    // Si el worker no llega a arrancar (o se rompe), se avisa en lugar de quedar cargando.
    const alFallar = (e: ErrorEvent) => {
      terminar();
      console.error('[dictado] el worker falló:', e.message, e);
      worker?.terminate();
      worker = null;
      rechazar(new Error(e.message || 'no se pudo cargar el dictado'));
    };
    const alResponder = (e: MessageEvent<RespuestaDictado>) => {
      if (e.data.id !== id) return;
      terminar();
      if ('error' in e.data) rechazar(new Error(e.data.error));
      else resolver(e.data.texto);
    };
    const espera = setTimeout(() => {
      terminar();
      worker?.terminate();
      worker = null;
      rechazar(new Error('tardó demasiado'));
    }, ESPERA_TRANSCRIPCION_MS);
    w.addEventListener('message', alResponder);
    w.addEventListener('error', alFallar);
    w.postMessage({ id, audio }, [audio.buffer]);
  });
}

// Tono corto: agudo al empezar a grabar, grave al terminar.
function tono(frecuencia: number): Promise<void> {
  return new Promise((resolver) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const volumen = ctx.createGain();
      osc.frequency.value = frecuencia;
      volumen.gain.setValueAtTime(0.15, ctx.currentTime);
      volumen.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(volumen).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      osc.onended = () => {
        void ctx.close();
        resolver();
      };
    } catch {
      resolver();
    }
  });
}

async function aMonoDe16k(grabacion: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: MUESTREO });
  try {
    const audio = await ctx.decodeAudioData(await grabacion.arrayBuffer());
    return new Float32Array(audio.getChannelData(0));
  } finally {
    void ctx.close();
  }
}

export function usarDictado(alTexto: (texto: string) => void, alError: (mensaje: string) => void) {
  const [estado, setEstado] = useState<EstadoDictado>('inactivo');
  const [progreso, setProgreso] = useState<number | null>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const corte = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      clearTimeout(corte.current);
      grabador.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function empezar(): Promise<void> {
    if (!(await window.api.dictadoListo())) {
      setEstado('preparando');
      setProgreso(0);
      const dejar = window.api.alProgresoDictado((avance) => montado.current && setProgreso(avance));
      try {
        await window.api.prepararDictado();
      } finally {
        dejar();
        if (montado.current) setProgreso(null);
      }
    }

    const microfono = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const partes: Blob[] = [];
    const rec = new MediaRecorder(microfono);
    grabador.current = rec;
    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    rec.onstop = async () => {
      microfono.getTracks().forEach((t) => t.stop());
      clearTimeout(corte.current);
      grabador.current = null;
      void tono(440);
      if (!montado.current) return;
      setEstado('transcribiendo');
      try {
        const texto = await transcribir(await aMonoDe16k(new Blob(partes, { type: rec.mimeType })));
        if (!montado.current) return;
        if (texto) alTexto(texto);
        else alError('No se escuchó nada. Probá de nuevo más cerca del micrófono.');
      } catch (e) {
        if (montado.current) alError(`No se pudo pasar la voz a texto: ${e instanceof Error ? e.message : e}`);
      } finally {
        if (montado.current) setEstado('inactivo');
      }
    };
    await tono(880);
    rec.start();
    setEstado('grabando');
    corte.current = setTimeout(() => rec.state === 'recording' && rec.stop(), MAXIMO_MS);
  }

  // El mismo botón empieza y termina.
  async function alternar(): Promise<void> {
    if (estado === 'grabando') {
      grabador.current?.stop();
      return;
    }
    if (estado !== 'inactivo') return;
    try {
      await empezar();
    } catch (e) {
      if (!montado.current) return;
      setEstado('inactivo');
      const nombre = e instanceof Error ? e.name : '';
      alError(
        nombre === 'NotAllowedError' || nombre === 'NotFoundError'
          ? 'No se pudo usar el micrófono. Revisá que esté conectado y que Windows le dé permiso a Syntra.'
          : e instanceof Error ? e.message : 'No se pudo empezar a dictar.',
      );
    }
  }

  return { estado, progreso, alternar };
}
