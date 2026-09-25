// Única responsabilidad: convertir una fecha (string ISO o Date) al formato que se muestra en pantalla.
export function formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '—';

    const valor = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (Number.isNaN(valor.getTime())) return '—';

    return valor.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
