import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Proyecto } from '../../types/proyectos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalConfirmarEliminar } from '../../components/nodos/modalConfirmarEliminar';
import { TarjetaProyecto } from '../../components/proyectos/tarjetaProyecto';
import { ModalProyecto, type DatosProyecto } from '../../components/proyectos/modalProyecto';
import { ID_USUARIO_ACTUAL, NOMBRE_USUARIO_ACTUAL } from './usuarioActual';
import '../../styles/nodos.css';
import '../../styles/proyectos.css';

export function ProyectosPage() {
    const navigate = useNavigate();
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [aEliminar, setAEliminar] = useState<Proyecto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(() => {
        return window.api
            .listarProyectos({
                idUsuario: ID_USUARIO_ACTUAL,
                busqueda: busqueda || undefined,
            })
            .then(setProyectos)
            .catch((e) => {
                console.error('No se pudo listar los proyectos', e);
                setError(e instanceof Error ? e.message : 'No se pudo cargar el listado.');
            });
    }, [busqueda]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const crear = async (datos: DatosProyecto) => {
        await window.api.crearProyecto({ idUsuario: ID_USUARIO_ACTUAL, ...datos });
        setMostrarCrear(false);
        await cargar();
    };

    return (
        <PlantillaLayout
            titulo="Proyectos"
            idActivo="proyectos"
            usuario={{ nombre: NOMBRE_USUARIO_ACTUAL }}
            onBuscar={setBusqueda}
        >
            {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}

            <div className="proyectos-grilla">
                {proyectos.map((p) => (
                    <TarjetaProyecto
                        key={p.idProyecto}
                        proyecto={p}
                        onAbrir={(proyecto) => navigate(`/proyectos/${proyecto.id_proyecto}`)}
                        onEliminar={setAEliminar}
                    />
                ))}

                <button
                    type="button"
                    className="tarjeta-crear-proyecto"
                    onClick={() => setMostrarCrear(true)}
                >
                    <span className="tarjeta-crear-proyecto__mas">+</span>
                    Crear proyecto
                </button>
            </div>

            {mostrarCrear && (
                <ModalProyecto onCancelar={() => setMostrarCrear(false)} onGuardar={crear} />
            )}

            {aEliminar && (
                <ModalConfirmarEliminar
                    titulo="Eliminar proyecto"
                    mensaje={
                        <>
                            ¿Seguro que querés eliminar <strong>{aEliminar.nombre}</strong>? Esta
                            acción no se puede deshacer.
                        </>
                    }
                    onCancelar={() => setAEliminar(null)}
                    onConfirmar={async () => {
                        try {
                            await window.api.eliminarProyecto({
                                id: aEliminar.idProyecto,
                                idUsuario: ID_USUARIO_ACTUAL,
                            });
                            await cargar();
                        } catch (e) {
                            console.error('No se pudo eliminar el proyecto', e);
                            setError('No se pudo eliminar el proyecto.');
                        } finally {
                            setAEliminar(null);
                        }
                    }}
                />
            )}
        </PlantillaLayout>
    );
}