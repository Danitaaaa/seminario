interface SegmentoRuta {
    id: number | null;
    nombre: string;
}

interface RutaMigasProps {
    segmentos: SegmentoRuta[];
    onNavegar: (id: number | null) => void;
}

// Muestra algo como "ruta/a/carpeta/actual/" a partir de la lista de ancestros
// del nodo activo. Cada segmento es clickeable para volver a esa carpeta.
export function RutaMigas({ segmentos, onNavegar }: RutaMigasProps) {
    return (
        <nav className="ruta-migas" aria-label="Ruta de la carpeta actual">
            {segmentos.map((segmento) => (
                <span key={segmento.id ?? 'raiz'} className="ruta-migas__segmento">
                    <button type="button" onClick={() => onNavegar(segmento.id)}>
                        {segmento.nombre}
                    </button>
                    <span className="ruta-migas__separador">/</span>
                </span>
            ))}
        </nav>
    );
}
