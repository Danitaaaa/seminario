import { VoiceCommand } from './VoiceCommand';
import { normalizarComando } from './normalizarComando';

export type ResultadoInterpretacion =
  | { tipo: 'comando'; comando: VoiceCommand }
  | { tipo: 'no-entendido'; textoNormalizado: string };

const COMANDOS_POR_TEXTO: Record<string, VoiceCommand> = {
  dashboard: VoiceCommand.DASHBOARD,
  inicio: VoiceCommand.DASHBOARD,
  tablero: VoiceCommand.DASHBOARD,
  flashcards: VoiceCommand.FLASHCARDS,
  material: VoiceCommand.MATERIAL,
  materiales: VoiceCommand.MATERIAL,
  calendario: VoiceCommand.CALENDARIO,
  eventos: VoiceCommand.CALENDARIO,
  horarios: VoiceCommand.HORARIOS,
  'sesiones de estudio': VoiceCommand.SESIONES_DE_ESTUDIO,
  'cerrar sesion': VoiceCommand.CERRAR_SESION,
  salir: VoiceCommand.CERRAR_SESION,
  ayuda: VoiceCommand.AYUDA,
  'que puedo decir': VoiceCommand.AYUDA,
};

export class VoiceInterpreter {
  static interpretar(texto: string): ResultadoInterpretacion {
    const textoNormalizado = normalizarComando(texto);
    const comando = COMANDOS_POR_TEXTO[textoNormalizado];

    return comando
      ? { tipo: 'comando', comando }
      : { tipo: 'no-entendido', textoNormalizado };
  }
}
