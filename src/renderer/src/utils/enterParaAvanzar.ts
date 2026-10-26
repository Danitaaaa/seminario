import type { KeyboardEvent } from 'react';

// Con Enter pasa al siguiente campo vacío; si ya están todos completos, envía el formulario.
export function enterParaAvanzar(enviar: () => void) {
  return (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key !== 'Enter' || !(evento.target instanceof HTMLInputElement)) return;
    evento.preventDefault();

    const campos = Array.from(evento.currentTarget.querySelectorAll<HTMLInputElement>('input:not([disabled])'));
    const actual = campos.indexOf(evento.target);
    const siguienteVacio = [...campos.slice(actual + 1), ...campos.slice(0, actual + 1)].find((campo) => !campo.value.trim());

    if (siguienteVacio) siguienteVacio.focus();
    else enviar();
  };
}