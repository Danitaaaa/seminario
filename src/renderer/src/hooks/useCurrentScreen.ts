import { useLocation } from 'react-router-dom';
import { VoiceCommand } from '../utils/VoiceCommand';

const PANTALLAS_POR_RUTA: Array<[RegExp, VoiceCommand]> = [
  [/^\/dashboard\/?$/, VoiceCommand.DASHBOARD],
  [/^\/flashcards(?:\/|$)/, VoiceCommand.FLASHCARDS],
  [/^\/material(?:\/|$)/, VoiceCommand.MATERIAL],
  [/^\/eventos\/?$/, VoiceCommand.CALENDARIO],
  [/^\/horarios\/?$/, VoiceCommand.HORARIOS],
  [/^\/sesiones(?:\/|$)/, VoiceCommand.SESIONES_DE_ESTUDIO],
];

export function detectarPantallaActual(pathname: string): VoiceCommand | null {
  return PANTALLAS_POR_RUTA.find(([ruta]) => ruta.test(pathname))?.[1] ?? null;
}

export function useCurrentScreen(): VoiceCommand | null {
  const { pathname } = useLocation();
  return detectarPantallaActual(pathname);
}
