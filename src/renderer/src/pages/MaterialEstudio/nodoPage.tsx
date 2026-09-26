import { useRef, useState, useEffect, useCallback } from 'react';
import type { MouseEvent, DragEvent } from 'react';
import type { Nodo } from '../../types/nodo';
import type { Direccion, OrdenarPor, VistaListado } from '../../types/vistaNodos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { RutaMigas } from '../../componentes/nodos/rutaMigas';
import { BarraFiltrosNodos } from '../../componentes/nodos/barraFiltrosNodos';
import { TablaNodos } from '../../componentes/nodos/tablaNodos';
import { CuadriculaNodos } from '../../componentes/nodos/cuadriculaNodos';
import { ModalNodo } from '../../componentes/nodos/modalNodo';
import { ModalConfirmarEliminar } from '../../componentes/nodos/modalConfirmarEliminar';
import '../../estilos/nodos.css';

const usuarioLogueado = 'Usuario';

type ModalAbierto =
    | { tipo: 'crear' }
    | { tipo: 'renombrar'; nodo: Nodo }
    | { tipo: 'eliminar'; nodo: Nodo }
    | { tipo: 'eliminarSeleccion' }
    | null;

type Miga = { id: number; nombre: string };

export function NodoPage() {
    const [idActivo, setIdActivo] = useState('material');

    const [nodos, setNodos] = useState<Nodo[]>([]);

    // --- Estado puramente de UI ---
    const [vista, setVista] = useState<VistaListado>('lista');
    const [ordenActivo, setOrdenActivo] = useState<OrdenarPor>('nombre');
    const [direccion, setDireccion] = useState<Direccion>('ASC');
    const [busqueda, setBusqueda] = useState('');
    const [menuAgregarAbierto, setMenuAgregarAbierto] = useState(false);
    const [modal, setModal] = useState<ModalAbierto>(null);

    // --- Selección: nodos resaltados, no checkboxes. Se usa tanto para acciones
    // --- en lote (eliminar) como para saber qué mover al soltar sobre una carpeta.
    const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
    const ultimoSeleccionadoId = useRef<number | null>(null);

    // --- Arrastre: qué ids se están moviendo y sobre qué carpeta está el mouse. ---
    const [destinoArrastre, setDestinoArrastre] = useState<number | null>(null);
    const arrastrandoIdsRef = useRef<number[]>([]);

    // --- Ruta: dónde estás parado ahora. La raíz real en BD tiene id = 1.
    const [ruta, setRuta] = useState<Miga[]>([{ id: 1, nombre: 'Raíz' }]);
    const idPadreActual = ruta[ruta.length - 1].id;

    const alternarOrden = (campo: OrdenarPor) => {
        if (campo === ordenActivo) {
            setDireccion((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        } else {
            setOrdenActivo(campo);
            setDireccion('ASC');
        }
    };

    const cargarContenido = useCallback(() => {
        window.api.listarContenido({
            idPadre: idPadreActual,
            ordenarPor: ordenActivo,
            direccion,
            busqueda: busqueda || undefined,
        }).then(setNodos);
    }, [idPadreActual, ordenActivo, direccion, busqueda]);

    useEffect(() => {
        cargarContenido();
    }, [cargarContenido]);

    const onSeleccionar = (nodo: Nodo, evento: MouseEvent) => {
        setSeleccionados((previo) => {
            const nuevo = new Set(previo);
            if (evento.shiftKey && ultimoSeleccionadoId.current !== null) {
                // Rango entre el último nodo clickeado y este, según el orden actual.
                const ids = nodos.map((n) => n.id);
                const desde = ids.indexOf(ultimoSeleccionadoId.current);
                const hasta = ids.indexOf(nodo.id);
                if (desde !== -1 && hasta !== -1) {
                    const [inicio, fin] = desde < hasta ? [desde, hasta] : [hasta, desde];
                    for (let i = inicio; i <= fin; i++) nuevo.add(ids[i]);
                }
            } else if (evento.ctrlKey || evento.metaKey) {
                if (nuevo.has(nodo.id)) nuevo.delete(nodo.id);
                else nuevo.add(nodo.id);
            } else {
                nuevo.clear();
                nuevo.add(nodo.id);
            }
            return nuevo;
        });
        ultimoSeleccionadoId.current = nodo.id;
    };

    const onArrastrarInicio = (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => {
        // Si el nodo arrastrado ya estaba seleccionado, se mueve toda la selección;
        // si no, el arrastre pasa a seleccionar solo ese nodo.
        const yaSeleccionado = seleccionados.has(nodo.id);
        const ids = yaSeleccionado ? Array.from(seleccionados) : [nodo.id];
        if (!yaSeleccionado) {
            setSeleccionados(new Set([nodo.id]));
            ultimoSeleccionadoId.current = nodo.id;
        }
        arrastrandoIdsRef.current = ids;
        evento.dataTransfer.effectAllowed = 'move';
        evento.dataTransfer.setData('text/plain', JSON.stringify(ids));
    };

    const onArrastrarSobre = (nodo: Nodo) => {
        if (arrastrandoIdsRef.current.includes(nodo.id)) return; // no se puede soltar sobre sí misma
        setDestinoArrastre(nodo.id);
    };

    const onSalirDestino = () => setDestinoArrastre(null);

    const onSoltar = async (nodoDestino: Nodo) => {
        setDestinoArrastre(null);
        const ids = arrastrandoIdsRef.current;
        arrastrandoIdsRef.current = [];

        if (ids.length === 0 || ids.includes(nodoDestino.id)) return;
        if (nodoDestino.tipo !== 'carpeta') return; // solo se puede mover contenido dentro de una carpeta

        try {
            await Promise.all(
                ids.map((id) => window.api.moverNodo({ id, idNuevoPadre: nodoDestino.id }))
            );
            cargarContenido();
        } catch (error) {
            console.error('No se pudo mover la selección', error);
            // TODO: mostrar feedback de error al usuario (toast, modal, etc.)
        }

        setSeleccionados(new Set());
    };

    const onAbrir = (nodo: Nodo) => {
        if (nodo.tipo === 'carpeta') {
            setRuta((prev) => [...prev, { id: nodo.id, nombre: nodo.nombre }]);
            setSeleccionados(new Set());
        }
        // TODO integración: si nodo.tipo === 'archivo', abrir/previsualizar el archivo
        // (todavía no hay caso de uso para esto del lado del backend).
    };

    const onNavegarMiga = (id: number) => {
        const indice = ruta.findIndex((m) => m.id === id);
        if (indice === -1) return;
        setRuta((prev) => prev.slice(0, indice + 1));
        setSeleccionados(new Set());
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
            <div
                className="nodos-modulo"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setSeleccionados(new Set());
                }}
            >
                <RutaMigas
                    segmentos={ruta}
                    onNavegar={onNavegarMiga}
                />

                <BarraFiltrosNodos
                    ordenActivo={ordenActivo}
                    direccion={direccion}
                    onOrdenar={alternarOrden}
                    vista={vista}
                    onCambiarVista={setVista}
                    menuAgregarAbierto={menuAgregarAbierto}
                    onToggleMenuAgregar={() => setMenuAgregarAbierto((v) => !v)}
                    onSubirArchivo={() => {
                        setMenuAgregarAbierto(false);
                        // TODO integración: abrir selector de archivos del sistema (dialog.showOpenDialog
                        // desde el main process) y llamar al caso de uso de creación de Archivo
                        // cuando exista (hoy solo hay CrearNodo para carpetas). Recargar con cargarContenido().
                        console.log('subir archivo');
                    }}
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
                        try {
                            await window.api.modificarNodo({ id: modal.nodo.id, nombre });
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
                    titulo="Eliminar carpeta"
                    mensaje={<>¿Seguro que querés eliminar <strong>{modal.nodo.nombre}</strong>? Esta acción no se puede deshacer.</>}
                    onCancelar={() => setModal(null)}
                    onConfirmar={async () => {
                        try {
                            await window.api.eliminarNodo({ id: modal.nodo.id });
                            console.error('Eliminar');
                            setModal(null);
                            await cargarContenido();
                        } catch (error) {
                            console.error('No se pudo eliminar', error);
                            // TODO: mostrar "la carpeta contiene elementos" si viene ese error puntual
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
                        const ids = Array.from(seleccionados);
                        console.log('ids a eliminar:', ids);
                        console.log("intentado");
                        const resultados = await Promise.allSettled(
                            ids.map((id) => window.api.eliminarNodo({ id }))
                        ); 

                        // Con allSettled, un rechazo (ej. "la carpeta contiene elementos") no corta
                        // el resto de los borrados ni te deja sin saber qué pasó con cada uno.
                        const fallidos = ids.filter((_, i) => resultados[i].status === 'rejected');
                        console.log("encontrados");
                        setModal(null);
                        setSeleccionados(new Set(fallidos)); // quedan tildados los que no se pudieron borrar
                        await cargarContenido();
                        console.log("eliminados");
                        console.log(fallidos);
                        if (fallidos.length > 0) {
                            // TODO: mostrar esto en la UI (toast/banner), no solo en consola.
                            console.error(`No se pudieron eliminar ${fallidos.length} elemento(s):`, fallidos);
                        }
                    }}
                />
            )}
            </PlantillaLayout>
    );
}