import { useRef, useState, useEffect, useCallback } from 'react';
import type { MouseEvent, DragEvent } from 'react';
import { claveNodo, type Nodo, type Archivo } from '../../types/nodo';
import type { Direccion, OrdenarPor, VistaListado } from '../../types/vistaNodos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { RutaMigas } from '../../componentes/nodos/rutaMigas';
import { BarraFiltrosNodos } from '../../componentes/nodos/barraFiltrosNodos';
import { TablaNodos } from '../../componentes/nodos/tablaNodos';
import { CuadriculaNodos } from '../../componentes/nodos/cuadriculaNodos';
import { ModalNodo } from '../../componentes/nodos/modalNodo';
import { ModalConfirmarEliminar } from '../../componentes/nodos/modalConfirmarEliminar';
import '../../estilos/nodos.css';
import { CartelError } from '../../componentes/comunes/cartelError';
import { ArchivosPage } from './archivosPage';
import { VisorArchivo } from '../../componentes/visor/visorArchivo';
import { ModalAbrirCon } from '../../componentes/visor/modalAbrirCon';
import { tipoVisor } from '../../componentes/visor/formatos';

const usuarioLogueado = 'Usuario';

// Tiempo que hay que dejar un nodo sobre una miga para que navegue a ella.
const RETARDO_NAVEGAR_MIGA_MS = 800;

type ModalAbierto =
    | { tipo: 'crear' }
    | { tipo: 'renombrar'; nodo: Nodo }
    | { tipo: 'eliminar'; nodo: Nodo }
    | { tipo: 'eliminarSeleccion' }
    | null;

type Miga = { id: number; nombre: string };

const eliminarUno = (n: Nodo) =>
    n.tipo === 'archivo'
        ? window.api.eliminarArchivo({ id: n.id })
        : window.api.eliminarNodo({ id: n.id });

export function NodoPage() {
    const [idActivo, setIdActivo] = useState('material');
    const [nodos, setNodos] = useState<Nodo[]>([]);

    const [vista, setVista] = useState<VistaListado>('lista');
    const [ordenActivo, setOrdenActivo] = useState<OrdenarPor>('nombre');
    const [direccion, setDireccion] = useState<Direccion>('ASC');
    const [busqueda, setBusqueda] = useState('');
    const [menuAgregarAbierto, setMenuAgregarAbierto] = useState(false);
    const [modal, setModal] = useState<ModalAbierto>(null);

    // Claves "tipo-id": carpetas y archivos pueden compartir id.
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const ultimoSeleccionado = useRef<string | null>(null);

    const [destinoArrastre, setDestinoArrastre] = useState<string | null>(null);
    const arrastrandoRef = useRef<Nodo[]>([]);

    // Drag sobre la ruta de migas
    const [destinoMiga, setDestinoMiga] = useState<number | null>(null);
    const timerMiga = useRef<ReturnType<typeof setTimeout> | null>(null);
    const migaEnEspera = useRef<number | null>(null);

    const [ruta, setRuta] = useState<Miga[]>([{ id: 1, nombre: 'Material Estudio' }]);
    const idPadreActual = ruta[ruta.length - 1].id;

    const [errorMover, setErrorMover] = useState<string | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
    const [errorListar, setErrorListar] = useState<string | null>(null);
    const [mostrarSubida, setMostrarSubida] = useState(false);
    const [archivoAbierto, setArchivoAbierto] = useState<Archivo | null>(null);
    const [archivoAbrirCon, setArchivoAbrirCon] = useState<Archivo | null>(null);
    const [errorAbrir, setErrorAbrir] = useState<string | null>(null);

    const nodosSeleccionados = nodos.filter((n) => seleccionados.has(claveNodo(n)));

    const alternarOrden = (campo: OrdenarPor) => {
        if (campo === ordenActivo) {
            setDireccion((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        } else {
            setOrdenActivo(campo);
            setDireccion('ASC');
        }
    };

    const cargarContenido = useCallback(() => {
        return window.api.listarContenido({
            idPadre: idPadreActual,
            ordenarPor: ordenActivo,
            direccion,
            busqueda: busqueda || undefined,
        })
            .then(setNodos)
            .catch((error) => {
                console.error('No se pudo listar el contenido', error);
                setErrorListar(error instanceof Error ? error.message : 'No se pudo cargar el listado.');
            });
    }, [idPadreActual, ordenActivo, direccion, busqueda]);

    useEffect(() => {
        cargarContenido();
    }, [cargarContenido]);

    const limpiarTimerMiga = useCallback(() => {
        if (timerMiga.current) clearTimeout(timerMiga.current);
        timerMiga.current = null;
        migaEnEspera.current = null;
    }, []);

    // Si el drag se cancela (soltar fuera, Esc) o termina, se limpia todo el estado visual.
    useEffect(() => {
        const limpiar = () => {
            limpiarTimerMiga();
            setDestinoMiga(null);
            setDestinoArrastre(null);
        };
        window.addEventListener('dragend', limpiar);
        window.addEventListener('drop', limpiar);
        return () => {
            window.removeEventListener('dragend', limpiar);
            window.removeEventListener('drop', limpiar);
            limpiarTimerMiga();
        };
    }, [limpiarTimerMiga]);

    const onSeleccionar = (nodo: Nodo, evento: MouseEvent) => {
        const clave = claveNodo(nodo);
        setSeleccionados((previo) => {
            const nuevo = new Set(previo);
            if (evento.shiftKey && ultimoSeleccionado.current !== null) {
                const claves = nodos.map(claveNodo);
                const desde = claves.indexOf(ultimoSeleccionado.current);
                const hasta = claves.indexOf(clave);
                if (desde !== -1 && hasta !== -1) {
                    const [inicio, fin] = desde < hasta ? [desde, hasta] : [hasta, desde];
                    for (let i = inicio; i <= fin; i++) nuevo.add(claves[i]);
                }
            } else if (evento.ctrlKey || evento.metaKey) {
                if (nuevo.has(clave)) nuevo.delete(clave);
                else nuevo.add(clave);
            } else {
                nuevo.clear();
                nuevo.add(clave);
            }
            return nuevo;
        });
        ultimoSeleccionado.current = clave;
    };

    const onArrastrarInicio = (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => {
        const clave = claveNodo(nodo);
        const yaSeleccionado = seleccionados.has(clave);
        if (!yaSeleccionado) {
            setSeleccionados(new Set([clave]));
            ultimoSeleccionado.current = clave;
        }
        arrastrandoRef.current = yaSeleccionado ? nodosSeleccionados : [nodo];
        evento.dataTransfer.effectAllowed = 'move';
        evento.dataTransfer.setData('text/plain', clave);
    };

    const onArrastrarSobre = (nodo: Nodo) => {
        if (nodo.tipo !== 'carpeta') return;
        if (arrastrandoRef.current.some((n) => claveNodo(n) === claveNodo(nodo))) return;
        setDestinoArrastre(claveNodo(nodo));
    };

    const onSalirDestino = () => setDestinoArrastre(null);

    // Mueve los nodos indicados a la carpeta `idDestino` y recarga el listado.
    const moverA = async (idDestino: number, aMover: Nodo[]) => {
        const idsArchivos = aMover.filter((n) => n.tipo === 'archivo').map((n) => n.id);
        const carpetas = aMover.filter((n) => n.tipo === 'carpeta');

        try {
            await Promise.all([
                ...(idsArchivos.length > 0
                    ? [window.api.moverArchivos({ ids: idsArchivos, idPadre: idDestino })]
                    : []),
                ...carpetas.map((c) => window.api.moverNodo({ id: c.id, idNuevoPadre: idDestino })),
            ]);
        } catch (error) {
            console.error('No se pudo mover la selección', error);
            setErrorMover('No se pudo mover la selección.');
        }

        setSeleccionados(new Set());
        await cargarContenido();
    };

    const onSoltar = async (destino: Nodo) => {
        setDestinoArrastre(null);
        const aMover = arrastrandoRef.current;
        arrastrandoRef.current = [];

        if (destino.tipo !== 'carpeta' || aMover.length === 0) return;
        if (aMover.some((n) => claveNodo(n) === claveNodo(destino))) return;

        await moverA(destino.id, aMover);
    };

    // ---- Drag sobre las migas ----

    const onArrastrarSobreMiga = (id: number) => {
        setDestinoMiga(id);
        if (migaEnEspera.current === id) return; // dragover se dispara continuamente
        limpiarTimerMiga();
        migaEnEspera.current = id;

        // Si ya estamos en esa carpeta no hace falta navegar
        if (id === idPadreActual) return;

        timerMiga.current = setTimeout(() => {
            setRuta((prev) => {
                const i = prev.findIndex((m) => m.id === id);
                return i === -1 ? prev : prev.slice(0, i + 1);
            });
            // Se mantiene la selección: los nodos siguen "en la mano"
            migaEnEspera.current = null;
        }, RETARDO_NAVEGAR_MIGA_MS);
    };

    const onSalirMiga = () => {
        limpiarTimerMiga();
        setDestinoMiga(null);
    };

    const onSoltarEnMiga = async (id: number) => {
        limpiarTimerMiga();
        setDestinoMiga(null);
        const aMover = arrastrandoRef.current;
        arrastrandoRef.current = [];
        if (aMover.length === 0) return;
        await moverA(id, aMover);
    };

    const onAbrir = (nodo: Nodo) => {
        if (nodo.tipo === 'carpeta') {
            setRuta((prev) => [...prev, { id: nodo.id, nombre: nodo.nombre }]);
            setSeleccionados(new Set());
            return;
        }
        // Formatos soportados se abren en el visor; el resto pregunta con qué abrirlo.
        if (tipoVisor(nodo.extension)) {
            setArchivoAbierto(nodo);
        } else {
            setArchivoAbrirCon(nodo);
        }
    };

    // Acepta `number | null` porque así lo declara RutaMigas (onNavegar).
    const onNavegarMiga = (id: number | null) => {
        if (id === null) return;
        const indice = ruta.findIndex((m) => m.id === id);
        if (indice === -1) return;
        setRuta((prev) => prev.slice(0, indice + 1));
        setSeleccionados(new Set());
    };

    const subirArchivo = () => {
        setMenuAgregarAbierto(false);
        setMostrarSubida(true);
    };

    const propsListado = {
        nodos,
        seleccionados,
        destinoArrastre,
        onSeleccionar,
        onArrastrarInicio,
        onArrastrarSobre,
        onSoltar,
        onSalirDestino,
        onAbrir,
        onRenombrar: (nodo: Nodo) => setModal({ tipo: 'renombrar', nodo }),
        onEliminar: (nodo: Nodo) => setModal({ tipo: 'eliminar', nodo }),
    };

    return (
        <PlantillaLayout
            titulo="Material Estudio"
            idActivo={idActivo}
            usuario={{ nombre: usuarioLogueado }}
            onNavegar={setIdActivo}
            onBuscar={setBusqueda}
        >
            {errorMover && (
                <CartelError mensaje={errorMover} onCerrar={() => setErrorMover(null)} />
            )}
            {errorEliminar && (
                <CartelError mensaje={errorEliminar} onCerrar={() => setErrorEliminar(null)} />
            )}
            {errorListar && (
                <CartelError mensaje={errorListar} onCerrar={() => setErrorListar(null)} />
            )}
            {errorAbrir && (
                <CartelError mensaje={errorAbrir} onCerrar={() => setErrorAbrir(null)} />
            )}

            {mostrarSubida ? (
                <ArchivosPage
                    idPadre={idPadreActual}
                    onVolver={() => {
                        setMostrarSubida(false);
                        cargarContenido();
                    }}
                />
            ) : (
            <div
                className="nodos-modulo"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setSeleccionados(new Set());
                }}
            >
                <RutaMigas
                    segmentos={ruta}
                    onNavegar={onNavegarMiga}
                    destinoArrastre={destinoMiga}
                    onArrastrarSobre={onArrastrarSobreMiga}
                    onSalirDestino={onSalirMiga}
                    onSoltar={onSoltarEnMiga}
                />

                <BarraFiltrosNodos
                    ordenActivo={ordenActivo}
                    direccion={direccion}
                    onOrdenar={alternarOrden}
                    vista={vista}
                    onCambiarVista={setVista}
                    menuAgregarAbierto={menuAgregarAbierto}
                    onToggleMenuAgregar={() => setMenuAgregarAbierto((v) => !v)}
                    onSubirArchivo={subirArchivo}
                    onCrearCarpeta={() => {
                        setMenuAgregarAbierto(false);
                        setModal({ tipo: 'crear' });
                    }}
                    onEliminarSeleccion={() => {
                        if (seleccionados.size === 0) return;
                        setModal({ tipo: 'eliminarSeleccion' });
                    }}
                    haySeleccion={seleccionados.size > 0}
                />
                {vista === 'lista' ? (
                    <TablaNodos {...propsListado} />
                ) : (
                    <CuadriculaNodos {...propsListado} />
                )}
            </div>
            )}

            {archivoAbierto && (
                <VisorArchivo
                    archivo={archivoAbierto}
                    onCerrar={() => setArchivoAbierto(null)}
                    onGuardado={cargarContenido}
                />
            )}

            {archivoAbrirCon && (
                <ModalAbrirCon
                    archivo={archivoAbrirCon}
                    onCerrar={() => setArchivoAbrirCon(null)}
                    onError={setErrorAbrir}
                />
            )}

            {modal?.tipo === 'crear' && (
                <ModalNodo
                    titulo="Nueva carpeta"
                    onCancelar={() => setModal(null)}
                    onGuardar={async (nombre) => {
                        try {
                            await window.api.crearNodo({ nombre, idPadre: idPadreActual });
                            setModal(null);
                            await cargarContenido();
                        } catch (error) {
                            console.error('No se pudo crear', error);
                        }
                    }}
                />
            )}

            {modal?.tipo === 'renombrar' && (
                <ModalNodo
                    titulo="Renombrar"
                    valorInicial={modal.nodo.nombre}
                    onCancelar={() => setModal(null)}
                    onGuardar={async (nombre) => {
                        const { nodo } = modal;
                        try {
                            if (nodo.tipo === 'archivo') {
                                await window.api.modificarArchivo({ id: nodo.id, nombre });
                            } else {
                                await window.api.modificarNodo({ id: nodo.id, nombre });
                            }
                            setModal(null);
                            await cargarContenido();
                        } catch (error) {
                            console.error('No se pudo renombrar', error);
                        }
                    }}
                />
            )}

            {modal?.tipo === 'eliminar' && (
                <ModalConfirmarEliminar
                    titulo={modal.nodo.tipo === 'archivo' ? 'Eliminar archivo' : 'Eliminar carpeta'}
                    mensaje={<>¿Seguro que querés eliminar <strong>{modal.nodo.nombre}</strong>? Esta acción no se puede deshacer.</>}
                    onCancelar={() => setModal(null)}
                    onConfirmar={async () => {
                        try {
                            await eliminarUno(modal.nodo);
                            setModal(null);
                            await cargarContenido();
                        } catch (error) {
                            console.error('No se pudo eliminar', error);
                            setErrorEliminar('No se pudo eliminar el elemento.');
                        }
                    }}
                />
            )}

            {modal?.tipo === 'eliminarSeleccion' && (
                <ModalConfirmarEliminar
                    titulo="Eliminar elementos"
                    mensaje={`¿Seguro que querés eliminar ${seleccionados.size} elemento${seleccionados.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
                    onCancelar={() => setModal(null)}
                    onConfirmar={async () => {
                        const aEliminar = nodosSeleccionados;
                        const resultados = await Promise.allSettled(aEliminar.map(eliminarUno));

                        const fallidos = aEliminar.filter((_, i) => resultados[i].status === 'rejected');
                        setModal(null);
                        setSeleccionados(new Set(fallidos.map(claveNodo)));
                        await cargarContenido();

                        if (fallidos.length > 0) {
                            setErrorEliminar(`No se pudieron eliminar ${fallidos.length} elemento(s)`);
                        }
                    }}
                />
            )}
        </PlantillaLayout>
    );
}