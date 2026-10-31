import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniCalendario } from '../comunes/miniCalendario';
import { MetasMensuales } from '../comunes/metasMensuales';
import type { RolMiembro } from '../../types/proyectos';

interface PanelLateralProyectoProps {
    idProyecto?: number;
    /** Rol del usuario en el proyecto (sin rol = sin permisos). */
    rol?: RolMiembro | null;
    calendario?: ReactNode;
    metas?: ReactNode;
}

export function PanelLateralProyecto({
    idProyecto,
    rol = null,
    calendario,
    metas,
}: PanelLateralProyectoProps) {
    const navigate = useNavigate();

    return (
        <aside className="panel-proyecto">
            <section className="panel-proyecto__tarjeta">
                <h2 className="panel-proyecto__titulo">Calendario del proyecto</h2>
                {calendario ?? <MiniCalendario idProyecto={idProyecto} />}
            </section>

            <section className="panel-proyecto__tarjeta">
                <h2 className="panel-proyecto__titulo">Tareas del proyecto</h2>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        type="button"
                        className="btn-proyecto"
                        disabled={idProyecto === undefined}
                        onClick={() => {
                            if (idProyecto !== undefined) {
                                navigate(`/proyectos/${idProyecto}/tareas`);
                            }
                        }}
                        style={{ width: '100%' }}
                    >
                        Ver Tareas
                    </button>
                </div>
            </section>

            <section className="panel-proyecto__tarjeta">
                <h2 className="panel-proyecto__titulo">Metas mensuales</h2>
                {metas ??
                    (idProyecto !== undefined ? (
                        <MetasMensuales idProyecto={idProyecto} rol={rol} />
                    ) : (
                        <div className="panel-proyecto__vacio">Próximamente</div>
                    ))}
            </section>
        </aside>
    );
}