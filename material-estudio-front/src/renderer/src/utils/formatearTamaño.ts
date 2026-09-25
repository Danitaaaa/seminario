// Única responsabilidad: convertir un tamaño en bytes a un string legible (KB, MB, GB...).
// No sabe nada de Nodo ni de la UI que lo consume.
const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatearTamaño(bytes: number): string {
    if (!bytes || bytes <= 0) return '—';

    const exponente = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        UNIDADES.length - 1
    );
    const valor = bytes / Math.pow(1024, exponente);
    const decimales = exponente === 0 ? 0 : 1;

    return `${valor.toFixed(decimales)} ${UNIDADES[exponente]}`;
}
