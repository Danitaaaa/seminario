import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Link2, Plus } from 'lucide-react';
import type { Proyecto } from '../../types/proyectos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalConfirmarEliminar } from '../../components/nodos/modalConfirmarEliminar';
import { TarjetaProyecto } from '../../components/proyectos/tarjetaProyecto';
import { ModalProyecto, type DatosProyecto } from '../../components/proyectos/modalProyecto';
import { ModalUnirseConEnlace } from '../../components/proyectos/modalUnirseConEnlace';
import { obtenerUsuarioId } from '../../../lib/sesion';
import '../../styles/nodos.css';
import '../../styles/proyectos.css';

export function ProyectosPage() {
    const navigate = useNavigate();
    const idUsuario = obtenerUsuarioId();
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarCrear, setMostrarCrear] = useState(false);
    const [mostrarUnirse, setMostrarUnirse] = useState(false);
    const [aEliminar, setAEliminar] = useState<Proyecto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        if (idUsuario === null) return;
        try {
            setProyectos(
                await window.api.listarProyectos({
                    idUsuario,
                    busqueda: busqueda || undefined,
                }),
            );
        } catch (e) {
            console.error('No se pudo listar los proyectos', e);
            setError(e instanceof Error ? e.message : 'No se pudo cargar el listado.');
        }
    }, [busqueda, idUsuario]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    // Sin sesión no se muestra nada: se vuelve al login.
    if (idUsuario === null) return <Navigate to="/login" replace />;

    const crear = async (datos: DatosProyecto) => {
        await window.api.crearProyecto({ idUsuario, ...datos });
        setMostrarCrear(false);
        await cargar();
    };

    const unirse = async (enlace: string) => {
        await window.api.unirseAProyecto({ idUsuario, enlace: enlace.trim() });
        setMostrarUnirse(false);
        await cargar();
    };

    return (
        <PlantillaLayout
            titulo="Proyectos"
            idActivo="proyectos"
            usuario={{ nombre: 'Usuario' }}
            onBuscar={setBusqueda}
        >
            {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}

            <div className="proyectos-grilla">
                {proyectos.map((p) => (
                    <TarjetaProyecto
                        key={p.idProyecto}
                        proyecto={p}
                        onAbrir={(proyecto) => navigate(`/proyectos/${proyecto.idProyecto}`)}
                        onEliminar={setAEliminar}
                    />
                ))}

                <div className="tarjeta-crear-proyecto">
                    <button type="button" className="tarjeta-crear-proyecto__opcion" onClick={() => setMostrarCrear(true)}>
                        <span className="tarjeta-crear-proyecto__mas"><Plus size={22} /></span>
                        Crear proyecto
                    </button>
                    <button type="button" className="tarjeta-crear-proyecto__opcion" onClick={() => setMostrarUnirse(true)}>
                        <span className="tarjeta-crear-proyecto__mas"><Link2 size={20} /></span>
                        Unirme con enlace
                    </button>
                </div>
            </div>

            {mostrarCrear && (
                <ModalProyecto onCancelar={() => setMostrarCrear(false)} onGuardar={crear} />
            )}

            {mostrarUnirse && (
                <ModalUnirseConEnlace onCancelar={() => setMostrarUnirse(false)} onUnirse={unirse} />
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
                                idProyecto: aEliminar.idProyecto,
                                idUsuario,
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