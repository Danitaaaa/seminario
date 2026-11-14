import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion } from '../../lib/sesion';
import { hablar } from '../utils/hablar';
import { VoiceCommand } from '../utils/VoiceCommand';
import { useCurrentScreen } from './useCurrentScreen';

interface DestinoVoz {
  ruta: string;
  nombre: string;
  confirmacionActual: string;
}

const DESTINOS: Partial<Record<VoiceCommand, DestinoVoz>> = {
  [VoiceCommand.DASHBOARD]: {
    ruta: '/dashboard',
    nombre: 'dashboard',
    confirmacionActual: 'Se encuentra en el dashboard',
  },
  [VoiceCommand.FLASHCARDS]: {
    ruta: '/flashcards',
    nombre: 'flashcards',
    confirmacionActual: 'Se encuentra en flashcards',
  },
  [VoiceCommand.MATERIAL]: {
    ruta: '/material',
    nombre: 'material',
    confirmacionActual: 'Se encuentra en material',
  },
  [VoiceCommand.CALENDARIO]: {
    ruta: '/eventos',
    nombre: 'calendario',
    confirmacionActual: 'Se encuentra en el calendario',
  },
  [VoiceCommand.HORARIOS]: {
    ruta: '/horarios',
    nombre: 'horarios',
    confirmacionActual: 'Se encuentra en horarios',
  },
  [VoiceCommand.SESIONES_DE_ESTUDIO]: {
    ruta: '/sesiones',
    nombre: 'sesiones de estudio',
    confirmacionActual: 'Se encuentra en sesiones de estudio',
  },
};

export function useVoiceNavigation(): (comando: VoiceCommand) => void {
  const navigate = useNavigate();
  const pantallaActual = useCurrentScreen();

  return useCallback(
    (comando: VoiceCommand) => {
      if (comando === VoiceCommand.AYUDA) return;

      if (comando === VoiceCommand.CERRAR_SESION) {
        cerrarSesion();
        navigate('/', { replace: true });
        hablar('Cerrando sesión');
        return;
      }

      const destino = DESTINOS[comando];
      if (!destino) return;

      if (pantallaActual === comando) {
        hablar(destino.confirmacionActual);
        return;
      }

      navigate(destino.ruta);
      hablar(`Abriendo ${destino.nombre}`);
    },
    [navigate, pantallaActual],
  );
}
