import { useCallback, useState } from 'react';

// Guarda una preferencia visual del usuario (paneles colapsados, vista lista/cuadrícula) en localStorage.
// Si el almacenamiento no está disponible se usa el valor inicial sin romper la pantalla.
export function usarPreferencia<T>(clave: string, inicial: T): [T, (valor: T | ((anterior: T) => T)) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(`pref:${clave}`);
      return guardado === null ? inicial : (JSON.parse(guardado) as T);
    } catch {
      return inicial;
    }
  });

  const actualizar = useCallback(
    (nuevo: T | ((anterior: T) => T)) => {
      setValor((anterior) => {
        const siguiente = typeof nuevo === 'function' ? (nuevo as (a: T) => T)(anterior) : nuevo;
        try {
          localStorage.setItem(`pref:${clave}`, JSON.stringify(siguiente));
        } catch {
          // Sin almacenamiento: la preferencia dura hasta cerrar la pantalla.
        }
        return siguiente;
      });
    },
    [clave]
  );

  return [valor, actualizar];
}
