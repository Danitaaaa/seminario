import type { Proyecto } from '../../types/proyectos';

interface TarjetaProyectoProps {
    proyecto: Proyecto;
    onAbrir: (proyecto: Proyecto) => void;
    onEliminar: (proyecto: Proyecto) => void;
}

const formatearFecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR');

export function TarjetaProyecto({ proyecto, onAbrir, onEliminar }: TarjetaProyectoProps) {
    const inicial = proyecto.nombre.trim().charAt(0).toUpperCase();
    // Si el backend no informa el rol, se muestra igual: los permisos los valida el main.
    const puedeEliminar = !proyecto.rol || proyecto.rol === 'propietario';

    return (
        <article className="tarjeta-proyecto">
            <header className="tarjeta-proyecto__cabecera">
                <span className="avatar-proyecto">{inicial}</span>
                <div>
                    <h3 className="tarjeta-proyecto__titulo">{proyecto.nombre}</h3>
                    <p className="tarjeta-proyecto__fecha">
                        Fecha de creación: {formatearFecha(proyecto.fechaCreacion)}
                    </p>
                </div>
            </header>

            <div className="tarjeta-proyecto__imagen" aria-hidden="true" />

            <div>
                <p className="tarjeta-proyecto__nombre">{proyecto.nombre}</p>
                <p className="tarjeta-proyecto__materia">
                    {proyecto.materiaAsociada ?? 'Sin materia asociada'}
                </p>
            </div>

            <footer className="tarjeta-proyecto__acciones">
                {puedeEliminar && (
                    <button
                        type="button"
                        className="btn-proyecto btn-proyecto--peligro"
                        onClick={() => onEliminar(proyecto)}
                    >
                        Eliminar proyecto
                    </button>
                )}
                <button type="button" className="btn-proyecto" onClick={() => onAbrir(proyecto)}>
                    Abrir
                </button>
            </footer>
        </article>
    );
}