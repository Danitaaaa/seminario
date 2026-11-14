import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { hablar } from '../utils/hablar';
import { activarModoVoz, usarVozPropia } from '../voz/narrador';
import { EVENTO_MODO_VOZ } from '../voz/bienvenida';

type ModoVoz = boolean | null;

interface VoiceContexto {
  modoVoz: ModoVoz;
  setModoVoz: Dispatch<SetStateAction<ModoVoz>>;
  responderModoVoz: (respuesta: boolean) => void;
}

const CLAVE_MODO_VOZ = 'syntra.modoVoz';
const ContextoVoz = createContext<VoiceContexto | null>(null);

// Con sesión abierta manda la elección de ese usuario; si no, la del cartel en esta compu.
function leerModoVoz(): ModoVoz {
  const delUsuario = window.localStorage.getItem(`syntra:modoVoz:${window.localStorage.getItem('usuarioId')}`);
  if (delUsuario !== null) return delUsuario !== 'no';
  const guardado = window.localStorage.getItem(CLAVE_MODO_VOZ);
  if (guardado === 'true') return true;
  if (guardado === 'false') return false;
  return null;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [modoVoz, setModoVoz] = useState<ModoVoz>(leerModoVoz);

  useEffect(() => {
    if (modoVoz === null) {
      window.localStorage.removeItem(CLAVE_MODO_VOZ);
    } else {
      // Con sesión abierta se guarda para ese usuario; sin sesión, para el login de esta compu.
      const idUsuario = window.localStorage.getItem('usuarioId');
      if (idUsuario) window.localStorage.setItem(`syntra:modoVoz:${idUsuario}`, modoVoz ? 'si' : 'no');
      else window.localStorage.setItem(CLAVE_MODO_VOZ, String(modoVoz));
    }
    // Con modo voz habla siempre la voz de Syntra (aunque haya NVDA); sin modo voz, nada.
    activarModoVoz(modoVoz !== false);
    usarVozPropia(modoVoz !== false);
  }, [modoVoz]);

  // Cada vez que se abre Syntra con modo voz: NVDA se despierta solo, se recuerda dormirlo.
  useEffect(() => {
    if (leerModoVoz() === true) {
      hablar('Si tenés NVDA prendido, activá el modo silencioso con Insert más Shift más S.');
    }
  }, []);

  // Al entrar un usuario, la bienvenida avisa su elección.
  useEffect(() => {
    const alCambiar = (e: Event) => setModoVoz((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENTO_MODO_VOZ, alCambiar);
    return () => window.removeEventListener(EVENTO_MODO_VOZ, alCambiar);
  }, []);

  const responderModoVoz = useCallback(
    (respuesta: boolean) => setModoVoz(respuesta),
    [],
  );

  useEffect(() => {
    const alPresionar = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        !event.ctrlKey ||
        !event.altKey ||
        event.key.toLowerCase() !== 'v'
      ) {
        return;
      }

      event.preventDefault();
      const siguiente = modoVoz !== true;
      setModoVoz(siguiente);
      hablar(siguiente ? 'Modo voz activado' : 'Modo voz desactivado');
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [modoVoz]);

  const valor = useMemo(
    () => ({ modoVoz, setModoVoz, responderModoVoz }),
    [modoVoz, responderModoVoz],
  );

  return <ContextoVoz.Provider value={valor}>{children}</ContextoVoz.Provider>;
}

export function useVoice(): VoiceContexto {
  const contexto = useContext(ContextoVoz);
  if (!contexto) throw new Error('useVoice debe usarse dentro de VoiceProvider.');
  return contexto;
}
