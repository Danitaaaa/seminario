import type { Nodo } from '../../types/nodo';
import { TarjetaNodo } from './tarjetaNodo';

interface CuadriculaNodosProps {
    nodos: Nodo[];
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
}

export function CuadriculaNodos({ nodos, onAbrir, onRenombrar, onEliminar }: CuadriculaNodosProps) {
    if (nodos.length === 0) {
        return <p className="nodos-vacio">Esta carpeta no tiene elementos.</p>;
    }

    return (
        <div className="cuadricula-nodos">
            {nodos.map((nodo) => (
                <TarjetaNodo
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
