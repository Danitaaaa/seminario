import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import type { Archivo, Nodo } from '../../types/nodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import { Icono } from '../comunes/icono';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

// Carpeta raíz de Material ("Material Estudio"), la misma que usa la pantalla de Material.
const ID_RAIZ_MATERIAL = 1;

type Miga = { id: number; nombre: string };

interface ModalAbrirMaterialProps {
  onElegir: (archivo: Archivo) => void;
  onCerrar: () => void;
}

// Ventana para abrir un archivo de Material como pestaña de la sesión.
// Se recorren las carpetas igual que en Material (clic para entrar, la ruta de arriba para volver)
// y al elegir un archivo se abre. Solo usa funciones que Material ya expone (listarContenido):
// no modifica nada de ese módulo.
export function ModalAbrirMaterial({ onElegir, onCerrar }: ModalAbrirMaterialProps) {
  const [ruta, setRuta] = useState<Miga[]>([{ id: ID_RAIZ_MATERIAL, nombre: 'Material' }]);
  const [nodos, setNodos] = useState<Nodo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const idCarpeta = ruta[ruta.length - 1].id;

  // Cada vez que se cambia de carpeta se carga su contenido.
  useEffect(() => {
    let activo = true;
    setNodos(null);
    setError(null);
    window.api
      .listarContenido({ idPadre: idCarpeta, ordenarPor: 'nombre', direccion: 'ASC' })
      .then((lista) => activo && setNodos(lista))
      .catch((e) => activo && setError(extraerMensajeError(e, 'No se pudo cargar el contenido de Material.')));
    return () => {
      activo = false;
    };
  }, [idCarpeta]);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  // Primero las carpetas y después los archivos, cada grupo por nombre; filtrado por la búsqueda.
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (nodos ?? [])
      .filter((n) => texto === '' || n.nombre.toLowerCase().includes(texto))
      .sort((a, b) =>
        a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, 'es') : a.tipo === 'carpeta' ? -1 : 1
      );
  }, [nodos, busqueda]);

  function entrar(carpeta: Miga) {
    setRuta((actual) => [...actual, carpeta]);
    setBusqueda('');
  }

  function volverA(indice: number) {
    setRuta((actual) => actual.slice(0, indice + 1));
    setBusqueda('');
  }

  const enRaiz = ruta.length === 1;

  return (
    <div className="sesiones__overlay" onClick={onCerrar}>
      <div
        className="sesiones__modal abrir-material"
        role="dialog"
        aria-modal="true"
        aria-labelledby="abrir-material-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="abrir-material__cabecera">
          <h3 id="abrir-material-titulo" className="sesiones__modal-titulo">Abrir desde Material</h3>
          <button type="button" className="abrir-material__cerrar" aria-label="Cerrar" onClick={onCerrar}>
            <X size={16} />
          </button>
        </div>
        <p className="sesiones__modal-texto">Entrá a una carpeta o elegí un archivo para abrirlo en una pestaña nueva.</p>

        <nav className="abrir-material__ruta" aria-label="Ubicación en Material">
          {ruta.map((miga, i) => {
            const ultima = i === ruta.length - 1;
            return (
              <span key={miga.id} className="abrir-material__miga">
                {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {ultima ? (
                  <span className="abrir-material__miga-actual" aria-current="page">{miga.nombre}</span>
                ) : (
                  <button type="button" className="abrir-material__miga-boton" onClick={() => volverA(i)}>
                    {miga.nombre}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        <label className="abrir-material__buscador">
          <Search size={15} aria-hidden="true" />
          <input
            value={busqueda}
            placeholder={enRaiz ? 'Buscar en Material…' : `Buscar en ${ruta[ruta.length - 1].nombre}…`}
            aria-label="Buscar en esta carpeta"
            autoFocus
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        {error && <p className="abrir-material__mensaje abrir-material__mensaje--error">{error}</p>}
        {!error && nodos === null && <p className="abrir-material__mensaje">Cargando…</p>}
        {!error && nodos !== null && visibles.length === 0 && (
          <p className="abrir-material__mensaje">
            {busqueda.trim() ? 'No hay resultados para esa búsqueda.' : 'Esta carpeta está vacía.'}
          </p>
        )}

        {visibles.length > 0 && (
          <ul className="abrir-material__lista">
            {visibles.map((nodo) => {
              const { icono, tipo } = resolverIconoNodo(nodo);
              if (nodo.tipo === 'carpeta') {
                return (
                  <li key={`carpeta-${nodo.id}`}>
                    <button
                      type="button"
                      className="abrir-material__item"
                      title={`Abrir la carpeta ${nodo.nombre}`}
                      onClick={() => entrar({ id: nodo.id, nombre: nodo.nombre })}
                    >
                      <Icono src={icono} tamaño={22} />
                      <span className="abrir-material__nombre">{nodo.nombre}</span>
                      <ChevronRight size={16} className="abrir-material__flecha" aria-hidden="true" />
                    </button>
                  </li>
                );
              }
              return (
                <li key={`archivo-${nodo.id}`}>
                  <button type="button" className="abrir-material__item" onClick={() => onElegir(nodo)}>
                    <Icono src={icono} tamaño={22} />
                    <span className="abrir-material__nombre">
                      {nodo.nombre}
                      {nodo.extension ? `.${nodo.extension}` : ''}
                    </span>
                    <span className="abrir-material__tipo">{tipo}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
