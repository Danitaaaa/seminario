interface IconoProps {
    src: string;
    alt?: string;
    tamaño?: number;
}

// Único lugar que decide cómo se renderiza un ícono svg en toda la app.
// Si mañana cambia el tamaño por defecto o se agrega lazy-loading, se edita acá.
export function Icono({ src, alt = '', tamaño = 20 }: IconoProps) {
    return (
        <img
            src={src}
            alt={alt}
            width={tamaño}
            height={tamaño}
            className="icono"
            draggable={false}
        />
    );
}
