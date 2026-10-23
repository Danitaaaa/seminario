import { useEffect, useState } from 'react';
import type { SesionEstudio, SnapshotSesionEnCurso } from '../../types/sesionesEstudio';

// Hook que mantiene la sesión en curso del usuario y su estado de Pomodoro.
// Al montarse le pide el estado actual al main y luego se suscribe al tick, así recargar no reinicia el timer.
export function useSesionEnCurso(usuarioId: number) {
  const [sesion, setSesion] = useState<SesionEstudio | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotSesionEnCurso | null>(null);

  useEffect(() => {
    let activo = true;

    window.api
      .obtenerSesionEnCurso(usuarioId)
      .then((actual) => {
        if (!activo) return;
        setSesion(actual.sesion);
        setSnapshot(actual.snapshot);
      })
      .catch(() => undefined);

    const desuscribir = window.api.onTickSesionEstudio((nuevo) => {
      if (activo) setSnapshot(nuevo);
    });

    return () => {
      activo = false;
      desuscribir();
    };
  }, [usuarioId]);

  return { sesion, snapshot, setSesion, setSnapshot };
}
