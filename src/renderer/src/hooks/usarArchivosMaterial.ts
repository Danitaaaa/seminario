// src/renderer/src/hooks/usarArchivosMaterial.ts
// Recorre Material (desde la raíz, carpeta por carpeta) y junta los archivos de los que la IA puede leer texto.
// Solo carga cuando `activo` es true (por ejemplo, cuando se abre el modal).
import { useCallback, useEffect, useState } from 'react';
import type { ArchivoMaterial } from '../utils/apiMaterialIA';

const ID_RAIZ_MATERIAL = 1;
const PROFUNDIDAD_MAXIMA = 8;
// Ajustá esta lista a lo que soporte logicaNoPersistente/ia/extractorTexto.ts.
const EXTENSIONES_CON_TEXTO = new Set(['pdf', 'docx', 'txt', 'md']);

async function recorrer(idPadre: number, ruta: string, acumulado: ArchivoMaterial[], profundidad: number): Promise<void> {
  const nodos = await window.api.listarContenido({ idPadre, ordenarPor: 'nombre', direccion: 'ASC' });
  for (const nodo of nodos) {
    if (nodo.tipo === 'archivo') {
      const extension = (nodo.extension ?? '').toLowerCase();
      if (EXTENSIONES_CON_TEXTO.has(extension)) {
        acumulado.push({ id: nodo.id, nombre: nodo.nombre, extension, carpeta: ruta });
      }
    } else if (profundidad < PROFUNDIDAD_MAXIMA) {
      await recorrer(nodo.id, ruta ? `${ruta} / ${nodo.nombre}` : nodo.nombre, acumulado, profundidad + 1);
    }
  }
}

export function usarArchivosMaterial(activo = true) {
  const [archivos, setArchivos] = useState<ArchivoMaterial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista: ArchivoMaterial[] = [];
      await recorrer(ID_RAIZ_MATERIAL, '', lista, 0);
      setArchivos(lista);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el material.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  return { archivos, cargando, error, recargar };
}