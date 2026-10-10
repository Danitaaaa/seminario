import type { DragEvent } from 'react';

interface SegmentoRuta {
    id: number | null;
    nombre: string;
}

interface RutaMigasProps {
    segmentos: SegmentoRuta[];
    onNavegar: (id: number | null) => void;
    // Drag & drop (opcionales)
    destinoArrastre?: number | null;
    onArrastrarSobre?: (id: number) => void;
    onSalirDestino?: () => void;
    onSoltar?: (id: number) => void;
}

export function RutaMigas({
    segmentos,
    onNavegar,
    destinoArrastre,
    onArrastrarSobre,
    onSalirDestino,
    onSoltar,
}: RutaMigasProps) {
    const sobre = (e: DragEvent<HTMLSpanElement>, id: number) => {
        e.preventDefault(); // necesario para permitir el drop
        e.dataTransfer.dropEffect = 'move';
        onArrastrarSobre?.(id);
    };

    const salir = (e: DragEvent<HTMLSpanElement>) => {
        // Ignora los dragleave al pasar entre hijos del mismo segmento
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        onSalirDestino?.();
    };

    return (
        <nav className="ruta-migas" aria-label="Ruta de la carpeta actual">
            {segmentos.map((segmento) => {
                const id = segmento.id;
                const esDestino = id !== null && destinoArrastre === id;
                return (
                    <span
                        key={id ?? 'raiz'}
                        className={`ruta-migas__segmento${esDestino ? ' ruta-migas__segmento--destino' : ''}`}
                        onDragOver={id !== null ? (e) => sobre(e, id) : undefined}
                        onDragLeave={id !== null ? salir : undefined}
                        onDrop={
                            id !== null
                                ? (e) => {
                                      e.preventDefault();
                                      onSoltar?.(id);
                                  }
                                : undefined
                        }
                    >
                        <button type="button" onClick={() => onNavegar(id)}>
                            {segmento.nombre}
                        </button>
                        <span className="ruta-migas__separador">/</span>
                    </span>
                );
            })}
        </nav>
    );
}