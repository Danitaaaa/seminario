// src/renderer/src/hooks/usarAnalisisPlanIA.ts
// "Analizar con IA" para la pantalla donde se pega el plan de estudios.
// Devuelve las materias en el MISMO formato que leerPlanEstudios: la vista previa y crearMaterias no cambian.
import { useRef, useState } from 'react';
import type { MateriaLeidaIA } from './../../../preload/apis/materialIA';
import { api, nuevoTrabajoIA } from '../utils/apiMaterialIA';

export function usarAnalisisPlanIA() {
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState('');
  const trabajo = useRef<ReturnType<typeof nuevoTrabajoIA> | null>(null);

  /** Devuelve las materias, o null si falló o se canceló (el motivo queda en `error`). */
  async function analizar(texto: string): Promise<MateriaLeidaIA[] | null> {
    setError('');
    setAnalizando(true);
    trabajo.current = nuevoTrabajoIA();
    try {
      const r = await api().leerPlanEstudiosIA({ trabajoId: trabajo.current.id, texto });
      if (r.ok) return r.materias;
      if (r.causa !== 'cancelado') {
        setError(
          r.causa === 'sin_proveedor'
            ? 'No hay ninguna IA disponible ahora. Probá más tarde o usá "Leer plan" sin IA.'
            : `La IA no pudo leer el plan: ${r.mensaje}`,
        );
      }
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo analizar el plan.');
      return null;
    } finally {
      setAnalizando(false);
      trabajo.current = null;
    }
  }

  const cancelar = () => void trabajo.current?.cancelar();
  return { analizar, cancelar, analizando, error, limpiarError: () => setError('') };
}
