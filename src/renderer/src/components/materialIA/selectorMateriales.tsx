// src/renderer/src/components/materialIA/selectorMateriales.tsx
// Elegir uno o varios archivos de Material para la IA. Se ve y se usa igual que "Abrir desde Material"
// (carpetas con flecha para entrar, la ruta de arriba para volver, buscador con lupa e íconos por tipo),
// pero cada archivo se tilda en lugar de abrirse. Las carpetas salen de la ruta de cada archivo
// (`carpeta`, "Carpeta / Subcarpeta"), así que no hace falta volver a pedir nada al main.
import { useMemo, useState } from 'react';
import { Check, ChevronRight, Search } from 'lucide-react';
import type { ArchivoMaterial } from '../../utils/apiMaterialIA';
import type { Nodo } from '../../types/nodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import { Icono } from '../comunes/icono';
import '../../styles/sesionesEstudio.css';
import '../../styles/selectorMateriales.css';

interface Props {
  archivos: ArchivoMaterial[];
  seleccionados: number[];
  onCambiar: (ids: number[]) => void;
  cargando?: boolean;
  deshabilitado?: boolean;
}

const SEPARADOR = ' / ';
const partesDe = (carpeta?: string) => (carpeta ? carpeta.split(SEPARADOR) : []);
const mismaRuta = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const empiezaCon = (ruta: string[], prefijo: string[]) => prefijo.every((x, i) => ruta[i] === x);

// resolverIconoNodo espera un nodo de Material: se arma lo mínimo que usa (tipo y extensión).
const iconoArchivo = (a: ArchivoMaterial) =>
  resolverIconoNodo({ tipo: 'archivo', extension: a.extension ?? '' } as unknown as Nodo);
const iconoCarpeta = () => resolverIconoNodo({ tipo: 'carpeta' } as unknown as Nodo).icono;

export function SelectorMateriales({ archivos, seleccionados, onCambiar, cargando = false, deshabilitado = false }: Props) {
  const [ruta, setRuta] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const texto = busqueda.trim().toLocaleLowerCase();

  // En la carpeta actual: sus subcarpetas (con cuántos archivos tienen adentro) y sus archivos.
  // Buscando, se muestran todos los archivos que coinciden, de cualquier carpeta.
  const { carpetas, visibles } = useMemo(() => {
    if (texto) {
      return { carpetas: [], visibles: archivos.filter((a) => a.nombre.toLocaleLowerCase().includes(texto)) };
    }
    const cantidades = new Map<string, number>();
    const aca: ArchivoMaterial[] = [];
    for (const a of archivos) {
      const partes = partesDe(a.carpeta);
      if (mismaRuta(partes, ruta)) aca.push(a);
      else if (partes.length > ruta.length && empiezaCon(partes, ruta)) {
        const siguiente = partes[ruta.length];
        cantidades.set(siguiente, (cantidades.get(siguiente) ?? 0) + 1);
      }
    }
    const carpetas = [...cantidades].sort(([a], [b]) => a.localeCompare(b, 'es'));
    return { carpetas, visibles: aca.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) };
  }, [archivos, ruta, texto]);

  const idsVisibles = visibles.map((a) => a.id);
  const todos = idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.includes(id));

  const alternar = (id: number) =>
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);

  const alternarTodos = () =>
    onCambiar(
      todos
        ? seleccionados.filter((id) => !idsVisibles.includes(id))
        : [...new Set([...seleccionados, ...idsVisibles])],
    );

  const irA = (nueva: string[]) => {
    setRuta(nueva);
    setBusqueda('');
  };

  if (cargando) return <p className="abrir-material__mensaje" role="status">Cargando tu material…</p>;
  if (archivos.length === 0) {
    return (
      <p className="abrir-material__mensaje">
        No hay archivos con texto en Material (PDF, Word, txt o md). Subí alguno y volvé a intentar.
      </p>
    );
  }

  return (
    <div className="selector-material">
      <div className="abrir-material__barra">
        <nav className="abrir-material__ruta" aria-label="Ubicación en Material">
          {['Material', ...ruta].map((nombre, i, migas) => {
            const ultima = i === migas.length - 1;
            return (
              <span key={`${i}-${nombre}`} className="abrir-material__miga">
                {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {ultima ? (
                  <span className="abrir-material__miga-actual" aria-current="page">{nombre}</span>
                ) : (
                  <button type="button" className="abrir-material__miga-boton" onClick={() => irA(ruta.slice(0, i))}>
                    {nombre}
                  </button>
                )}
              </span>
            );
          })}
        </nav>
        <span className="selector-material__contador">
          {seleccionados.length} {seleccionados.length === 1 ? 'elegido' : 'elegidos'}
        </span>
      </div>

      <label className="abrir-material__buscador">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          placeholder={ruta.length ? `Buscar en ${ruta[ruta.length - 1]}…` : 'Buscar en Material…'}
          aria-label="Buscar en tu material"
          disabled={deshabilitado}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      {visibles.length > 1 && (
        <button
          type="button"
          className="selector-material__todos"
          role="checkbox"
          aria-checked={todos}
          disabled={deshabilitado}
          onClick={alternarTodos}
        >
          <span className={`selector-material__casilla${todos ? ' selector-material__casilla--tildada' : ''}`} aria-hidden="true">
            {todos && <Check size={13} strokeWidth={3} />}
          </span>
          {texto ? 'Elegir todos los resultados' : 'Elegir todos los de esta carpeta'}
        </button>
      )}

      {carpetas.length === 0 && visibles.length === 0 ? (
        <p className="abrir-material__mensaje">
          {texto ? 'No hay resultados para esa búsqueda.' : 'Esta carpeta no tiene archivos que la IA pueda leer.'}
        </p>
      ) : (
        <ul className="abrir-material__lista selector-material__lista">
          {carpetas.map(([nombre, cantidad]) => (
            <li key={`carpeta-${nombre}`}>
              <button
                type="button"
                className="abrir-material__item"
                title={`Abrir la carpeta ${nombre}`}
                disabled={deshabilitado}
                onClick={() => irA([...ruta, nombre])}
              >
                <Icono src={iconoCarpeta()} tamaño={22} />
                <span className="abrir-material__nombre">{nombre}</span>
                <span className="abrir-material__tipo">{cantidad} {cantidad === 1 ? 'archivo' : 'archivos'}</span>
                <ChevronRight size={16} className="abrir-material__flecha" aria-hidden="true" />
              </button>
            </li>
          ))}
          {visibles.map((a) => {
            const elegido = seleccionados.includes(a.id);
            const { icono, tipo } = iconoArchivo(a);
            return (
              <li key={`archivo-${a.id}`}>
                <button
                  type="button"
                  className={`abrir-material__item selector-material__archivo${elegido ? ' selector-material__archivo--elegido' : ''}`}
                  role="checkbox"
                  aria-checked={elegido}
                  disabled={deshabilitado}
                  onClick={() => alternar(a.id)}
                >
                  <span className={`selector-material__casilla${elegido ? ' selector-material__casilla--tildada' : ''}`} aria-hidden="true">
                    {elegido && <Check size={13} strokeWidth={3} />}
                  </span>
                  <Icono src={icono} tamaño={22} />
                  <span className="abrir-material__nombre">
                    {a.nombre}
                    {a.extension ? `.${a.extension}` : ''}
                    {texto && a.carpeta && <small className="selector-material__ubicacion">{a.carpeta}</small>}
                  </span>
                  <span className="abrir-material__tipo">{tipo}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
