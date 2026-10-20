import type { ReactNode } from 'react';

interface PanelLateralProyectoProps {
    calendario?: ReactNode;
    metas?: ReactNode;
}

export function PanelLateralProyecto({ calendario, metas }: PanelLateralProyectoProps) {
    return (
        <aside className="panel-proyecto">
            <section className="panel-proyecto__tarjeta">
                <h2 className="panel-proyecto__titulo">Calendario del proyecto</h2>
                {calendario ?? <div className="panel-proyecto__vacio">Próximamente</div>}
            </section>

            <section className="panel-proyecto__tarjeta">
                <h2 className="panel-proyecto__titulo">Metas mensuales</h2>
                {metas ?? <div className="panel-proyecto__vacio">Próximamente</div>}
            </section>
        </aside>
    );
}