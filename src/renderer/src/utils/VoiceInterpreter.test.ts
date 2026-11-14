import { describe, expect, it } from 'vitest';
import { normalizarComando } from './normalizarComando';
import { VoiceCommand } from './VoiceCommand';
import { VoiceInterpreter } from './VoiceInterpreter';

describe('normalizarComando', () => {
  it.each([
    ['Flashcards', 'flashcards'],
    ['flash cards', 'flashcards'],
    ['abrir flashcards', 'flashcards'],
    ['¡IR A flash cards!', 'flashcards'],
    ['¿Qué puedo decir?', 'que puedo decir'],
    ['CERRÁ la sesión', 'cerrar sesion'],
  ])('normaliza "%s" como "%s"', (entrada, esperado) => {
    expect(normalizarComando(entrada)).toBe(esperado);
  });
});

describe('VoiceInterpreter', () => {
  it.each([
    ['abrir dashboard', VoiceCommand.DASHBOARD],
    ['Flash cards', VoiceCommand.FLASHCARDS],
    ['ir a material de estudio', VoiceCommand.MATERIAL],
    ['calendario', VoiceCommand.CALENDARIO],
    ['abrime los horarios', VoiceCommand.HORARIOS],
    ['sesion de estudio', VoiceCommand.SESIONES_DE_ESTUDIO],
    ['cerrar la sesión', VoiceCommand.CERRAR_SESION],
    ['necesito ayuda', VoiceCommand.AYUDA],
  ])('interpreta "%s"', (frase, comando) => {
    expect(VoiceInterpreter.interpretar(frase)).toEqual({
      tipo: 'comando',
      comando,
    });
  });

  it('devuelve no entendido sin lanzar error para texto desconocido', () => {
    expect(VoiceInterpreter.interpretar('abrir la ventana azul')).toEqual({
      tipo: 'no-entendido',
      textoNormalizado: 'la ventana azul',
    });
  });
});
