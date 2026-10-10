interface CartelErrorProps {
    mensaje: string;
    titulo?: string;
    // Si se pasa, muestra una "x" para cerrar.
    onCerrar?: () => void;
    // Para errores recuperables 
    onReintentar?: () => void;
}

export function CartelError({ mensaje, titulo = 'Ocurrió un error', onCerrar, onReintentar }: CartelErrorProps) {
    return (
        <div className="cartel-error" role="alert">
            <svg className="cartel-error__icono" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="7" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
            </svg>

            <div className="cartel-error__contenido">
                <p className="cartel-error__titulo">{titulo}</p>
                <p className="cartel-error__mensaje">
                    {mensaje.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')}
                </p>
                {onReintentar && (
                    <button type="button" className="cartel-error__reintentar" onClick={onReintentar}>
                        Reintentar
                    </button>
                )}
            </div>

            {onCerrar && (
                <button type="button" className="cartel-error__cerrar" onClick={onCerrar} aria-label="Cerrar">
                    ×
                </button>
            )}
        </div>
    );
}