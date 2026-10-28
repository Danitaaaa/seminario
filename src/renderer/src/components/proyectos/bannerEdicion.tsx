import type { EstadoEdicion } from '../../hooks/useEdicionCompartida';
import '../../styles/edicion.css';

const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export function formatearHora(valor: Date | string | null): string {
    if (!valor) return 'sin datos';
    const d = new Date(valor);
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return mismoDia(d, new Date()) ? hora : `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${hora}`;
}

interface Props {
    estado: EstadoEdicion;
    onReintentar?: () => void;
    onResolverConflicto?: () => void;
}

export function BannerEdicion({ estado, onReintentar, onResolverConflicto }: Props) {
    if (estado.fase === 'cargando' || estado.fase === 'local') return null;

    if (estado.fase === 'edicion') {
        if (estado.pendienteSubida) {
            return <Cartel tono="aviso">Guardado en tu equipo. Se subirá cuando haya conexión y el elemento esté libre.</Cartel>;
        }
        if (estado.sinConexion) {
            return <Cartel tono="aviso">Sin conexión: tus cambios se subirán al reconectar y podrían generar un conflicto.</Cartel>;
        }
        return null;
    }

    if (estado.fase === 'perdido') {
        return (
            <Cartel tono="error" accion={onReintentar && { texto: 'Reintentar', onClick: onReintentar }}>
                Perdiste el bloqueo de edición (venció o lo tomó otra persona). Tus cambios quedaron guardados en tu equipo
                y se subirán cuando el elemento esté libre.
            </Cartel>
        );
    }
    if (estado.fase === 'conflicto') {
        return (
            <Cartel tono="error" accion={onResolverConflicto && { texto: 'Resolver', onClick: onResolverConflicto }}>
                Otra persona guardó una versión distinta mientras editabas. Hay que elegir con cuál quedarse.
            </Cartel>
        );
    }
    if (estado.fase === 'error') return <Cartel tono="error">{estado.mensaje}</Cartel>;

    const ultima = `Última versión guardada ${formatearHora(estado.ultimaModificacion)}${estado.ultimoAutor ? ` por ${estado.ultimoAutor}` : ''}`;
    switch (estado.motivo) {
        case 'bloqueado':
            return (
                <Cartel tono="info" accion={onReintentar && { texto: 'Intentar editar', onClick: onReintentar }}>
                    <strong>{estado.titular?.nombre ?? 'Otra persona'}</strong> está editando desde las {formatearHora(estado.desde)} · {ultima}.
                    Solo podés ver el contenido.
                </Cartel>
            );
        case 'lector':
            return <Cartel tono="info">Solo lectura (tu rol es lector). {ultima}.</Cartel>;
        case 'sin_conexion':
            return <Cartel tono="aviso" accion={onReintentar && { texto: 'Reintentar', onClick: onReintentar }}>
                Sin conexión: solo podés ver la última versión descargada.
            </Cartel>;
        case 'eliminado':
            return <Cartel tono="error">Este elemento fue eliminado por otro miembro del proyecto.</Cartel>;
        case 'conflicto':
            return (
                <Cartel tono="error" accion={onResolverConflicto && { texto: 'Resolver', onClick: onResolverConflicto }}>
                    Hay un conflicto sin resolver en este elemento.
                </Cartel>
            );
    }
}

function Cartel({ tono, accion, children }: {
    tono: 'info' | 'aviso' | 'error';
    accion?: { texto: string; onClick: () => void };
    children: React.ReactNode;
}) {
    return (
        <div className={`edicion-banner edicion-banner--${tono}`} role="status">
            <span>{children}</span>
            {accion && <button type="button" className="edicion-banner__accion" onClick={accion.onClick}>{accion.texto}</button>}
        </div>
    );
}