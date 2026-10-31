import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Miembro, Proyecto } from '../../types/proyectos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { NodoPage } from '../materialEstudio/nodoPage';
import { CartelError } from '../../components/comunes/cartelError';
import { AvataresMiembros } from '../../components/proyectos/avataresMiembros';
import { GestionMiembros } from '../../components/proyectos/gestionMiembros';
import { PanelLateralProyecto } from '../../components/proyectos/panelLateralProyecto';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { rolDe } from '../../permisos';
import '../../styles/nodos.css';
import '../../styles/proyectos.css';

const NOMBRE_USUARIO_ACTUAL = ''; // Pendiente hasta implementación de perfil

// El id se lee dentro del componente (no al importar el módulo) para que ya exista la sesión.
// Si no hay sesión, no se monta el detalle: así dentro el id siempre es number.
export function ProyectoDetallePage() {
    const idUsuario = obtenerUsuarioId();
    const navigate = useNavigate();

    if (idUsuario === null) {
        return (
            <PlantillaLayout
                titulo="Proyecto"
                idActivo="proyectos"
                usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}
            >
                <CartelError
                    mensaje="No hay una sesión iniciada. Volvé a ingresar."
                    onCerrar={() => navigate('/')}
                />
            </PlantillaLayout>
        );
    }

    return <ProyectoDetalleContenido ID_USUARIO_ACTUAL={idUsuario} />;
}

function ProyectoDetalleContenido({ ID_USUARIO_ACTUAL }: { ID_USUARIO_ACTUAL: number }) {
    const { id } = useParams();
    const idProyecto = Number(id);
    const navigate = useNavigate();

    const [proyecto, setProyecto] = useState<Proyecto | null>(null);
    const [miembros, setMiembros] = useState<Miembro[]>([]);
    const [error, setError] = useState<string | null>(null);

    // No captura errores a propósito: GestionMiembros los muestra en su cartel.
    const recargarMiembros = useCallback(async () => {
        const m = await window.api.listarMiembros({
            idProyecto,
            idUsuarioSolicitante: ID_USUARIO_ACTUAL,
        });
        setMiembros(m);
    }, [idProyecto, ID_USUARIO_ACTUAL]);

    useEffect(() => {
        let activo = true;
        Promise.all([
            window.api.obtenerProyecto({ idProyecto, idUsuario: ID_USUARIO_ACTUAL }),
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
    }, [idProyecto, ID_USUARIO_ACTUAL]);

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

    // Qué puede hacer cada rol está en shared/permisos.ts
    const rol = rolDe(miembros, ID_USUARIO_ACTUAL);

    return (
        <NodoPage
            key={proyecto.idProyecto}
            titulo={proyecto.nombre}
            idActivo="proyectos"
            raiz={{ id: proyecto.idNodoRaiz, nombre: proyecto.nombre }}
            vistaInicial="cuadricula"
            rol={rol}
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
            subencabezado={
                <>
                    <AvataresMiembros miembros={miembros} />
                    <GestionMiembros
                        idProyecto={proyecto.idProyecto}
                        idUsuarioActual={ID_USUARIO_ACTUAL}
                        miembros={miembros}
                        onCambio={recargarMiembros}
                        onAbandono={() => navigate('/proyectos')}
                    />
                </>
            }
            lateral={<PanelLateralProyecto idProyecto={proyecto.idProyecto} rol={rol} />}
        />
    );
}