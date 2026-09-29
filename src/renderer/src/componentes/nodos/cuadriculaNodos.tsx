import type { MouseEvent, DragEvent } from 'react';
import { claveNodo, type Nodo } from '../../types/nodo';
import { TarjetaNodo } from './tarjetaNodo';

interface CuadriculaNodosProps {
    nodos: Nodo[];
    seleccionados: Set<string>;
    destinoArrastre: string | null;
    onSeleccionar: (nodo: Nodo, evento: MouseEvent) => void;
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
    onArrastrarInicio: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onArrastrarSobre: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSoltar: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSalirDestino: () => void;
}

export function CuadriculaNodos({
    nodos, seleccionados, destinoArrastre,
    onSeleccionar, onAbrir, onRenombrar, onEliminar,
    onArrastrarInicio, onArrastrarSobre, onSoltar, onSalirDestino,
}: CuadriculaNodosProps) {
    if (nodos.length === 0) {
        return <p className="nodos-vacio">Esta carpeta no tiene elementos.</p>;
    }

    return (
        <div className="cuadricula-nodos">
            {nodos.map((nodo) => {
                const clave = claveNodo(nodo);
                return (
                    <TarjetaNodo
                        key={clave}
                        nodo={nodo}
                        seleccionado={seleccionados.has(clave)}
                        sobreDestino={destinoArrastre === clave}
                        onSeleccionar={onSeleccionar}
                        onAbrir={onAbrir}
                        onRenombrar={onRenombrar}
                        onEliminar={onEliminar}
                        onArrastrarInicio={onArrastrarInicio}
                        onArrastrarSobre={onArrastrarSobre}
                        onSoltar={onSoltar}
                        onSalirDestino={onSalirDestino}
                    />
                );
            })}
        </div>
    );
}