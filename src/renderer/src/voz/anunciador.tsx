import { useEffect, useState } from 'react';
import { escucharAnuncios } from './narrador';

export function Anunciador() {
  const [texto, setTexto] = useState('');

  useEffect(
    () =>
      escucharAnuncios((nuevo) => {
        setTexto('');
        requestAnimationFrame(() => setTexto(nuevo));
      }),
    []
  );

  return (
    <div role="status" aria-live="polite" className="soloLectores">
      {texto}
    </div>
  );
}