import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MouseEvent, DragEvent, ReactNode } from 'react';
import { claveNodo, type Nodo, type Archivo } from '../../types/nodo';
import type { Direccion, OrdenarPor, VistaListado } from '../../types/vistaNodos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { RutaMigas } from '../../components/nodos/rutaMigas';
import { BarraFiltrosNodos } from '../../components/nodos/barraFiltrosNodos';
import { TablaNodos } from '../../components/nodos/tablaNodos';
import { CuadriculaNodos } from '../../components/nodos/cuadriculaNodos';
import { ModalNodo } from '../../components/nodos/modalNodo';
import { ModalEditarCarpeta } from '../../components/nodos/modalEditarCarpeta';
import type { OpcionMateria } from '../../types/materias';
import { FiltroMateria } from '../../components/nodos/filtroMateria';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { ModalConfirmarEliminar } from '../../components/nodos/modalConfirmarEliminar';
import '../../styles/nodos.css';
import { CartelError } from '../../components/comunes/cartelError';
import { usarAvisos } from '../../hooks/usarAvisos';
import type { ResultadoImportacion } from '../../types/nodo';
import { ArchivosPage } from './archivosPage';
import { VisorArchivo } from '../../components/visor/visorArchivo';
import { ModalAbrirCon } from '../../components/visor/modalAbrirCon';
import { tipoVisor } from '../../components/visor/formatos';
import { leerVistaListado, guardarVistaListado } from '../../utils/vistaListadoGuardada';
import type { RolMiembro } from '../../types/proyectos';
import { puede } from '../../permisos';
import { useCambiosRemotos } from '../../hooks/useCambiosRemotos';
import { ConflictosProyecto } from '../../components/proyectos/conflictosProyecto';

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

const RAIZ_MATERIAL: Miga = { id: 1, nombre: 'Material Estudio' };

interface NodoPageProps {
    titulo?: string;
    idActivo?: string;
    raiz?: Miga; // Carpeta desde la que arranca la navegación
    idProyecto?: number; // Si está, el listado se actualiza solo con los cambios remotos de ese proyecto
    vistaInicial?: VistaListado;
    prefijoRuta?: ReactNode; // Antes de las migas (ej. "Proyectos /")
    subencabezado?: ReactNode; // Debajo de las migas (ej. avatares de colaboradores)
    lateral?: ReactNode; // Panel derecho (ej. panel lateral del proyecto)
    rol?: RolMiembro | null; // Rol en el proyecto; por defecto 'propietario' (material personal)
}

const eliminarUno = (n: Nodo) =>
    n.tipo === 'archivo'
        ? window.api.eliminarArchivo({ id: n.id })
        : window.api.eliminarNodo({ id: n.id });

export function NodoPage({
    titulo = 'Material Estudio',
    idActivo = 'material',
    raiz = RAIZ_MATERIAL,
    idProyecto,
    vistaInicial,
    prefijoRuta,
    subencabezado,
    lateral,
    rol = 'propietario',
}: NodoPageProps = {}) {
    const [nodos, setNodos] = useState<Nodo[]>([]);

    // Si la pantalla que la usa (ej. un proyecto) no pide una vista, se usa la última elegida.
    const [vista, setVistaState] = useState<VistaListado>(() => vistaInicial ?? leerVistaListado());
    const setVista = (nueva: VistaListado) => {setVistaState(nueva); guardarVistaListado(nueva);};
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

    // Se puede abrir directo en una carpeta: /material?carpeta=12&nombre=DDS (lo usa el cuaderno).
    const [parametros] = useSearchParams();
    const carpetaInicial = Number(parametros.get('carpeta'));
    const [ruta, setRuta] = useState<Miga[]>(
        carpetaInicial ? [raiz, { id: carpetaInicial, nombre: parametros.get('nombre') ?? 'Carpeta' }] : [raiz]
    );
    const idPadreActual = ruta[ruta.length - 1].id;

    const [errorMover, setErrorMover] = useState<string | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
    const [errorListar, setErrorListar] = useState<string | null>(null);
    const [mostrarSubida, setMostrarSubida] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [soltandoAfuera, setSoltandoAfuera] = useState(false); // archivos del explorador encima del listado
    const avisos = usarAvisos();
    const [archivoAbierto, setArchivoAbierto] = useState<Archivo | null>(null);
    const [archivoAbrirCon, setArchivoAbrirCon] = useState<Archivo | null>(null);
    const [errorAbrir, setErrorAbrir] = useState<string | null>(null);

    // Materias: solo en el Material personal (en un proyecto las carpetas son compartidas).
    const conMaterias = raiz.id === RAIZ_MATERIAL.id;
    const [materias, setMaterias] = useState<OpcionMateria[]>([]);
    const [filtroMateria, setFiltroMateria] = useState<number | ''>('');
    const materiaFiltrada = materias.find((m) => m.idMateria === filtroMateria);

    const nodosSeleccionados = nodos.filter((n) => seleccionados.has(claveNodo(n)));

    const puedeMover = (n: Nodo) => puede(rol, n.tipo === 'archivo' ? 'archivo.mover' : 'carpeta.mover');
    const puedeEliminarNodo = (n: Nodo) => puede(rol, n.tipo === 'archivo' ? 'archivo.eliminar' : 'carpeta.eliminar');
    const puedeRenombrarNodo = (n: Nodo) => puede(rol, n.tipo === 'archivo' ? 'archivo.renombrar' : 'carpeta.renombrar');

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
            // Con filtro de materia se busca en todo Material, desde la raíz.
            idPadre: filtroMateria === '' ? idPadreActual : raiz.id,
            ordenarPor: ordenActivo,
            direccion,
            busqueda: busqueda || undefined,
            idMateria: filtroMateria === '' ? undefined : filtroMateria,
        })
            .then(setNodos)
            .catch((error) => {
                console.error('No se pudo listar el contenido', error);
                setErrorListar(error instanceof Error ? error.message : 'No se pudo cargar el listado.');
            });
    }, [idPadreActual, ordenActivo, direccion, busqueda, filtroMateria, raiz.id]);

    // Cambios que llegan de otras PCs: se vuelve a listar la carpeta actual.
    // Sin idProyecto (material de estudio personal) no hay nada que escuchar.
    useCambiosRemotos(idProyecto, () => {
        void cargarContenido();
    });

    useEffect(() => {
        cargarContenido();
    }, [cargarContenido]);

    useEffect(() => {
        if (!conMaterias) return;
        window.api.listarMateriasUsuario({ usuarioId: obtenerUsuarioId() ?? 0 })
            .then(setMaterias)
            .catch(() => setMaterias([]));
    }, [conMaterias]);

    const limpiarTimerMiga = useCallback(() => {
        if (timerMiga.current) clearTimeout(timerMiga.current);
        timerMiga.current = null;
        migaEnEspera.current = null;
    }, []);

    // Si el drag se cancela o termina, se limpia todo el estado visual.
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
        if (!puedeMover(nodo)) { evento.preventDefault(); return; }
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
        if (nodo.tipo !== 'carpeta' || arrastrandoRef.current.length === 0) return;
        if (arrastrandoRef.current.some((n) => claveNodo(n) === claveNodo(nodo))) return;
        setDestinoArrastre(claveNodo(nodo));
    };

    const onSalirDestino = () => setDestinoArrastre(null);

    const moverA = async (idDestino: number, candidatos: Nodo[]) => {
        const aMover = candidatos.filter(puedeMover);
        if (aMover.length === 0) return;
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

    const onArrastrarSobreMiga = (id: number) => {
        if (arrastrandoRef.current.length === 0) return;
        setDestinoMiga(id);
        if (migaEnEspera.current === id) return;
        limpiarTimerMiga();
        migaEnEspera.current = id;

        if (id === idPadreActual) return;

        timerMiga.current = setTimeout(() => {
            setRuta((prev) => {
                const i = prev.findIndex((m) => m.id === id);
                return i === -1 ? prev : prev.slice(0, i + 1);
            });
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
            // Desde el filtro por materia la carpeta puede estar en cualquier nivel: se entra desde la raíz.
            if (filtroMateria !== '') {
                setFiltroMateria('');
                setRuta([raiz, { id: nodo.id, nombre: nodo.nombre }]);
                setSeleccionados(new Set());
                return;
            }
            setRuta((prev) => [...prev, { id: nodo.id, nombre: nodo.nombre }]);
            setSeleccionados(new Set());
            return;
        }
        if (tipoVisor(nodo.extension)) {
            setArchivoAbierto(nodo);
        } else {
            setArchivoAbrirCon(nodo);
        }
    };

    const onNavegarMiga = (id: number | null) => {
        if (id === null) return;
        const indice = ruta.findIndex((m) => m.id === id);
        if (indice === -1) return;
        setRuta((prev) => prev.slice(0, indice + 1));
        setSeleccionados(new Set());
    };

    const subirArchivo = () => {
        if (!puede(rol, 'archivo.subir')) return;
        setMenuAgregarAbierto(false);
        setMostrarSubida(true);
    };

    const puedeImportar = puede(rol, 'archivo.subir') && puede(rol, 'carpeta.crear');

    // Sube con la función que le pasen y avisa cuánto entró.
    async function importar(subir: () => Promise<ResultadoImportacion | null>) {
        setSubiendo(true);
        try {
            const r = await subir();
            if (!r) return;
            const partes = [
                r.carpetas && `${r.carpetas} ${r.carpetas === 1 ? 'carpeta' : 'carpetas'}`,
                r.archivos && `${r.archivos} ${r.archivos === 1 ? 'archivo' : 'archivos'}`,
            ].filter(Boolean);
            avisos.exito(partes.length ? `Se subieron ${partes.join(' y ')}.` : 'No había nada para subir.');
            if (r.salteados) avisos.info(`Se saltearon ${r.salteados} ocultos o sin extensión.`);
            await cargarContenido();
        } catch (e) {
            avisos.error(e instanceof Error ? e.message.split('Error: ').pop()! : 'No se pudo subir.');
        } finally {
            setSubiendo(false);
        }
    }

    const subirCarpeta = () => {
        if (!puedeImportar) return;
        setMenuAgregarAbierto(false);
        void importar(() => window.api.subirCarpeta({ idPadre: idPadreActual }));
    };

    // Soltar archivos o carpetas del explorador. Los arrastres internos (mover nodos) no traen "Files".
    const traeArchivos = (e: DragEvent) => e.dataTransfer.types.includes('Files');
    const propsSoltarAfuera = puedeImportar ? {
        onDragOver: (e: DragEvent) => {
            if (!traeArchivos(e)) return;
            e.preventDefault();
            setSoltandoAfuera(true);
        },
        onDragLeave: (e: DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setSoltandoAfuera(false);
        },
        onDrop: (e: DragEvent) => {
            if (!traeArchivos(e)) return;
            e.preventDefault();
            setSoltandoAfuera(false);
            const rutas = Array.from(e.dataTransfer.files).map((f) => window.api.rutaDeArchivo(f)).filter(Boolean);
            if (rutas.length) void importar(() => window.api.importarRutas({ idPadre: idPadreActual, rutas }));
        },
    } : {};

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
        rol,
        onRenombrar: (nodo: Nodo) => { if (puedeRenombrarNodo(nodo)) setModal({ tipo: 'renombrar', nodo }); },
        onEliminar: (nodo: Nodo) => { if (puedeEliminarNodo(nodo)) setModal({ tipo: 'eliminar', nodo }); },
    };

    return (
        <PlantillaLayout
            titulo={titulo}
            idActivo={idActivo}
            usuario={{ nombre: usuarioLogueado }}
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
                    rol={rol}
                    onVolver={() => {
                        setMostrarSubida(false);
                        cargarContenido();
                    }}
                />
            ) : (
                <div className={lateral ? 'nodos-pagina nodos-pagina--con-lateral' : 'nodos-pagina'}>
                    <div
                        className={`nodos-modulo${soltandoAfuera ? ' nodos-modulo--soltar' : ''}`}
                        {...propsSoltarAfuera}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSeleccionados(new Set());
                        }}
                    >
                        <div className="nodos-ruta-fila">
                            {prefijoRuta}
                            <RutaMigas
                                segmentos={ruta}
                                onNavegar={onNavegarMiga}
                                destinoArrastre={destinoMiga}
                                onArrastrarSobre={onArrastrarSobreMiga}
                                onSalirDestino={onSalirMiga}
                                onSoltar={onSoltarEnMiga}
                            />
                        </div>

                        {subencabezado}

                        <ConflictosProyecto idProyecto={idProyecto} entidad="archivo" onResuelto={() => void cargarContenido()} />

                        {conMaterias && materias.length > 0 && (
                            <div className="nodos-filtro-materia">
                                <FiltroMateria materias={materias} valor={filtroMateria} onCambiar={setFiltroMateria} />
                                {materiaFiltrada && (
                                    <span className="nodos-filtro-materia__aviso">
                                        Carpetas de <strong>{materiaFiltrada.nombre}</strong> en todo tu Material
                                        <button type="button" onClick={() => setFiltroMateria('')}>Quitar filtro</button>
                                    </span>
                                )}
                            </div>
                        )}

                        <BarraFiltrosNodos
                            ordenActivo={ordenActivo}
                            direccion={direccion}
                            onOrdenar={alternarOrden}
                            vista={vista}
                            onCambiarVista={setVista}
                            rol={rol}
                            menuAgregarAbierto={menuAgregarAbierto}
                            onToggleMenuAgregar={() => setMenuAgregarAbierto((v) => !v)}
                            onSubirArchivo={subirArchivo}
                            onSubirCarpeta={subirCarpeta}
                            onCrearCarpeta={() => {
                                setMenuAgregarAbierto(false);
                                setModal({ tipo: 'crear' });
                            }}
                            onEliminarSeleccion={() => {
                                if (!nodosSeleccionados.some(puedeEliminarNodo)) return;
                                setModal({ tipo: 'eliminarSeleccion' });
                            }}
                            haySeleccion={nodosSeleccionados.some(puedeEliminarNodo)}
                        />
                        {subiendo && <p className="nodos-subiendo" role="status">Subiendo…</p>}
                        {vista === 'lista' ? (
                            <TablaNodos {...propsListado} />
                        ) : (
                            <CuadriculaNodos {...propsListado} />
                        )}
                    </div>
                    {lateral}
                </div>
            )}

            {archivoAbierto && (
                <VisorArchivo
                    archivo={archivoAbierto}
                    soloLectura={!puede(rol, 'archivo.editarContenido')}
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

            {modal?.tipo === 'renombrar' && modal.nodo.tipo === 'carpeta' && conMaterias && (
                <ModalEditarCarpeta
                    carpeta={modal.nodo}
                    materias={materias}
                    onCancelar={() => setModal(null)}
                    onGuardar={async (nombre, idMateria) => {
                        try {
                            await window.api.modificarNodo({ id: modal.nodo.id, nombre, idMateria });
                            setModal(null);
                            await cargarContenido();
                        } catch (error) {
                            console.error('No se pudo editar la carpeta', error);
                        }
                    }}
                />
            )}

            {modal?.tipo === 'renombrar' && !(modal.nodo.tipo === 'carpeta' && conMaterias) && (
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
                    mensaje={`¿Seguro que querés eliminar ${nodosSeleccionados.filter(puedeEliminarNodo).length} elemento${nodosSeleccionados.filter(puedeEliminarNodo).length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
                    onCancelar={() => setModal(null)}
                    onConfirmar={async () => {
                        const aEliminar = nodosSeleccionados.filter(puedeEliminarNodo);
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