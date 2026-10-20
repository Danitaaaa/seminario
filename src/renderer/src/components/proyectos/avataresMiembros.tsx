import type { Miembro } from '../../types/proyectos';

const MAX_AVATARES = 4;

export function AvataresMiembros({ miembros }: { miembros: Miembro[] }) {
    const inicial = (m: Miembro) => (m.nombre ?? m.mail ?? '?').charAt(0).toUpperCase();

    return (
        <div className="avatares-miembros">
            <div className="avatares-miembros__pila">
                {miembros.slice(0, MAX_AVATARES).map((m) => (
                    <span key={m.idUsuario} className="avatar-proyecto" title={m.nombre ?? m.mail}>
                        {inicial(m)}
                    </span>
                ))}
            </div>
            <span>
                {miembros.length} colaborador{miembros.length === 1 ? '' : 'es'}
            </span>
        </div>
    );
}