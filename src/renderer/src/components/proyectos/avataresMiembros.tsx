import type { Miembro } from '../../types/proyectos';
import { claveMiembro, coloresDeMiembros } from '../../utils/tablero';

const MAX_AVATARES = 4;

export function AvataresMiembros({ miembros, idUsuarioActual }: { miembros: Miembro[]; idUsuarioActual: number }) {
    const inicial = (m: Miembro) => (m.nombre ?? m.mail ?? '?').charAt(0).toUpperCase();
    // Mismos colores que en la lista de miembros y la División de tareas.
    const colores = coloresDeMiembros(miembros.filter((m) => m.activo), (m) => m.idUsuario === idUsuarioActual);

    return (
        <div className="avatares-miembros">
            <div className="avatares-miembros__pila">
                {miembros.slice(0, MAX_AVATARES).map((m) => {
                    const color = colores.get(claveMiembro(m));
                    return (
                        <span
                            key={claveMiembro(m)}
                            className="avatar-proyecto"
                            title={m.nombre ?? m.mail}
                            style={color ? { background: color.fondo, color: color.texto } : undefined}
                        >
                            {inicial(m)}
                        </span>
                    );
                })}
            </div>
            <span>
                {miembros.length} colaborador{miembros.length === 1 ? '' : 'es'}
            </span>
        </div>
    );
}
