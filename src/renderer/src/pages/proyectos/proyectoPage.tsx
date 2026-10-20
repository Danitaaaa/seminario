import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Miembro, Proyecto } from '../../types/proyectos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { NodoPage } from '../materialEstudio/nodoPage';
import { CartelError } from '../../components/comunes/cartelError';
import { AvataresMiembros } from '../../components/proyectos/avataresMiembros';
import { PanelLateralProyecto } from '../../components/proyectos/panelLateralProyecto';
import { ID_USUARIO_ACTUAL, NOMBRE_USUARIO_ACTUAL } from './usuarioActual';
import '../../styles/nodos.css';
import '../../styles/proyectos.css';

export function ProyectoDetallePage() {
    const { id } = useParams();
    const idProyecto = Number(id);
    const navigate = useNavigate();

    const [proyecto, setProyecto] = useState<Proyecto | null>(null);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;
        Promise.all([
            window.api.obtenerProyecto({ id: idProyecto, idUsuario: ID_USUARIO_ACTUAL }),
            window.api.listarMiembros({
                idProyecto,
                idUsuarioSolicitante: ID_USUARIO_ACTUAL,
            }),
        ])
            .then(([p, m]) => {
                if (!activo) return;
                setProyecto(p);
                setMiembros(m);
            })
            .catch((e) => {
                console.error('No se pudo abrir el proyecto', e);
                if (activo) setError('No se pudo abrir el proyecto.');
            });
        return () => {
            activo = false;
        };
    }, [idProyecto]);

    if (!proyecto) {
        return (
            <PlantillaLayout
                titulo="Proyecto"
                idActivo="proyectos"
                usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}
            >
                {error ? (
                    <CartelError mensaje={error} onCerrar={() => navigate('/proyectos')} />
                ) : (
                    <p>Cargando…</p>
                )}
            </PlantillaLayout>
        );
    }

    return (
        <NodoPage
            key={proyecto.id_proyecto}
            titulo={proyecto.nombre}
            idActivo="proyectos"
            raiz={{ id: proyecto.id_nodo_raiz, nombre: proyecto.nombre }}
            vistaInicial="cuadricula"
            prefijoRuta={
                <>
                    <button
                        type="button"
                        className="proyecto-ruta-volver"
                        onClick={() => navigate('/proyectos')}
                    >
                        Proyectos
                    </button>
                    <span>/</span>
                </>
            }
            subencabezado={<AvataresMiembros miembros={miembros} />}
            lateral={<PanelLateralProyecto />}
        />
    );
}