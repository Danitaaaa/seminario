import type { Nodo } from '../../types/nodo';
import { FilaNodo } from './filaNodo';

interface TablaNodosProps {
    nodos: Nodo[];
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
}

// Solo arma la tabla (encabezado + filas). No sabe ordenar ni filtrar:
// recibe los nodos ya en el orden que deben mostrarse.
export function TablaNodos({ nodos, onAbrir, onRenombrar, onEliminar }: TablaNodosProps) {
    if (nodos.length === 0) {
        return <p className="nodos-vacio">Esta carpeta no tiene elementos.</p>;
    }

    return (
        <div className="tabla-nodos" role="table">
            <div className="tabla-nodos__encabezado" role="row">
                <span>Nombre</span>
                <span>Tipo</span>
                <span>Tamaño</span>
                <span>FechaCarga</span>
                <span>FechaUltimaModificacion</span>
                <span>FechaUltimoAcceso</span>
                <span aria-hidden="true" />
            </div>

            {nodos.map((nodo) => (
                <FilaNodo
                    key={nodo.id}
                    nodo={nodo}
                    onAbrir={onAbrir}
                    onRenombrar={onRenombrar}
                    onEliminar={onEliminar}
                />
            ))}
        </div>
    );
}
