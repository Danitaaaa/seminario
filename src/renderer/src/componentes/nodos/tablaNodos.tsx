import type { MouseEvent, DragEvent } from 'react';
import type { Nodo } from '../../types/nodo';
import { FilaNodo } from './filaNodo';

interface TablaNodosProps {
    nodos: Nodo[];
    seleccionados: Set<number>;
    destinoArrastre: number | null;
    onSeleccionar: (nodo: Nodo, evento: MouseEvent) => void;
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
    onArrastrarInicio: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onArrastrarSobre: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSoltar: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSalirDestino: () => void;
}

// Solo arma la tabla (encabezado + filas) y reparte el estado de selección/arrastre
// que le pasa NodoPage. No decide cómo se selecciona ni cómo se mueve.
export function TablaNodos({
    nodos, seleccionados, destinoArrastre,
    onSeleccionar, onAbrir, onRenombrar, onEliminar,
    onArrastrarInicio, onArrastrarSobre, onSoltar, onSalirDestino,
}: TablaNodosProps) {
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
                    seleccionado={seleccionados.has(nodo.id)}
                    sobreDestino={destinoArrastre === nodo.id}
                    onSeleccionar={onSeleccionar}
                    onAbrir={onAbrir}
                    onRenombrar={onRenombrar}
                    onEliminar={onEliminar}
                    onArrastrarInicio={onArrastrarInicio}
                    onArrastrarSobre={onArrastrarSobre}
                    onSoltar={onSoltar}
                    onSalirDestino={onSalirDestino}
                />
            ))}
        </div>
    );
}