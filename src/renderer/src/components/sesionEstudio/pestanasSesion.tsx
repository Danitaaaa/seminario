import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import type { PestanaSesion } from '../../types/sesionesEstudio';
import type { Archivo } from '../../types/nodo';
import { MenuAgregarPestana } from './menuAgregarPestana';

interface PestanasSesionProps {
  pestanas: PestanaSesion[];
  idActiva: number | null;
  onElegir: (idPestana: number) => void;
  onAgregar: () => void;
  onAbrirArchivo: () => void;
  // Archivos de Material abiertos como pestañas (no son parte del documento de la sesión).
  archivos: Archivo[];
  idArchivoActivo: number | null;
  onElegirArchivo: (idArchivo: number) => void;
  onCerrarArchivo: (idArchivo: number) => void;
  onRenombrar: (idPestana: number, titulo: string) => void;
  onEliminar: (pestana: PestanaSesion) => void;
}

// Barra de pestañas del editor (Pestaña 1, Pestaña 2...). Doble clic para renombrar,
// la cruz de la pestaña activa para eliminarla y "+" para crear otra o abrir un archivo de Material.
export function PestanasSesion({
  pestanas,
  idActiva,
  onElegir,
  onAgregar,
  onAbrirArchivo,
  onRenombrar,
  onEliminar,
  archivos,
  idArchivoActivo,
  onElegirArchivo,
  onCerrarArchivo,
}: PestanasSesionProps) {
  const [editando, setEditando] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');

  function confirmar(pestana: PestanaSesion) {
    const limpio = titulo.trim();
    setEditando(null);
    if (limpio !== '' && limpio !== pestana.titulo) onRenombrar(pestana.idPestana, limpio.slice(0, 60));
  }

  return (
    <div className="pestanas-sesion" role="tablist" aria-label="Pestañas del documento">
      {pestanas.map((pestana) => {
        const activa = pestana.idPestana === idActiva;
        if (editando === pestana.idPestana) {
          return (
            <input
              key={pestana.idPestana}
              className="pestanas-sesion__input"
              autoFocus
              value={titulo}
              maxLength={60}
              aria-label="Nombre de la pestaña"
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => confirmar(pestana)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmar(pestana);
                if (e.key === 'Escape') setEditando(null);
              }}
            />
          );
        }
        return (
          <div key={pestana.idPestana} className={`pestanas-sesion__pestana${activa ? ' pestanas-sesion__pestana--activa' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={activa}
              className="pestanas-sesion__boton"
              title="Doble clic para renombrar"
              onClick={() => onElegir(pestana.idPestana)}
              onDoubleClick={() => {
                setTitulo(pestana.titulo);
                setEditando(pestana.idPestana);
              }}
            >
              {pestana.titulo}
            </button>
            {activa && pestanas.length > 1 && (
              <button
                type="button"
                className="pestanas-sesion__cerrar"
                aria-label={`Eliminar ${pestana.titulo}`}
                title="Eliminar pestaña"
                onClick={() => onEliminar(pestana)}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      {archivos.map((archivo) => {
        const activa = archivo.id === idArchivoActivo;
        const nombre = `${archivo.nombre}${archivo.extension ? `.${archivo.extension}` : ''}`;
        return (
          <div
            key={`archivo-${archivo.id}`}
            className={`pestanas-sesion__pestana pestanas-sesion__pestana--archivo${activa ? ' pestanas-sesion__pestana--activa' : ''}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activa}
              className="pestanas-sesion__boton"
              title={`${nombre} (abierto desde Material)`}
              onClick={() => onElegirArchivo(archivo.id)}
            >
              <FileText size={12} aria-hidden="true" />
              {nombre}
            </button>
            <button
              type="button"
              className="pestanas-sesion__cerrar"
              aria-label={`Cerrar ${nombre}`}
              title="Cerrar archivo"
              onClick={() => onCerrarArchivo(archivo.id)}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <MenuAgregarPestana onCrearPestana={onAgregar} onAbrirArchivo={onAbrirArchivo} />
    </div>
  );
}
