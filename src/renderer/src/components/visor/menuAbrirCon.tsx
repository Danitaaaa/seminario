import { useState } from 'react';
import type { Archivo } from '../../types/nodo';
import { ModalAbrirCon } from './modalAbrirCon';

interface MenuAbrirConProps {
  archivo: Archivo;
  onError: (mensaje: string) => void;
}

// Botón "Abrir con" del visor: abre el mismo cartel que se usa para los formatos que la app no muestra.
export function MenuAbrirCon({ archivo, onError }: MenuAbrirConProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" className="visor-boton visor-boton--contorno" onClick={() => setAbierto(true)}>
        Abrir con…
      </button>
      {abierto && (
        <ModalAbrirCon archivo={archivo} onCerrar={() => setAbierto(false)} onError={onError} />
      )}
    </>
  );
}