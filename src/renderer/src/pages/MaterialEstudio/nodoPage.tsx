import { useState } from 'react';
import type { Nodo } from '../../types/nodo';
import type { Direccion, OrdenarPor, VistaListado } from '../../types/vistaNodos';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { RutaMigas } from '../../componentes/nodos/rutaMigas';
import { BarraFiltrosNodos } from '../../componentes/nodos/barraFiltrosNodos';
import { TablaNodos } from '../../componentes/nodos/tablaNodos';
import { CuadriculaNodos } from '../../componentes/nodos/cuadriculaNodos';
import { ModalNodo } from '../../componentes/nodos/modalNodo';
import { ModalConfirmarEliminar } from '../../componentes/nodos/modalConfirmarEliminar';
import { nodosEjemplo } from './nodosEjemplo.mock';
import '../../estilos/nodos.css';

const usuarioLogueado = 'Usuario';

// Qué modal está abierto en un momento dado. Un solo estado en vez de tres
// booleanos sueltos evita que dos modales queden abiertos a la vez por error.
type ModalAbierto =
    | { tipo: 'crear' }
    | { tipo: 'renombrar'; nodo: Nodo }
    | { tipo: 'eliminar'; nodo: Nodo }
    | null;

export function NodoPage() {
    const [idActivo, setIdActivo] = useState('material');

    // --- Estado de datos: hoy con datos de ejemplo, listo para reemplazar por ---
    // --- el resultado real de nodosRepositorio.buscar() (ver guía de integración) ---
    const [nodos] = useState<Nodo[]>(nodosEjemplo);

    // --- Estado puramente de UI ---
    const [vista, setVista] = useState<VistaListado>('lista');
    const [ordenActivo, setOrdenActivo] = useState<OrdenarPor>('nombre');
    const [direccion, setDireccion] = useState<Direccion>('ASC');
    const [menuAgregarAbierto, setMenuAgregarAbierto] = useState(false);
    const [modal, setModal] = useState<ModalAbierto>(null);

    // TODO integración: reemplazar por la ruta real de ancestros del nodo activo.
    const rutaActual = [
        { id: null, nombre: 'ruta' },
        { id: null, nombre: 'a' },
        { id: null, nombre: 'carpeta' },
        { id: null, nombre: 'actual' },
    ];

    const alternarOrden = (campo: OrdenarPor) => {
        if (campo === ordenActivo) {
            setDireccion((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        } else {
            setOrdenActivo(campo);
            setDireccion('ASC');
        }
        // TODO integración: disparar la búsqueda real con { ordenarPor: campo, direccion }.
    };

    return (
        <PlantillaLayout
            titulo="Material Estudio"
            idActivo={idActivo}
            usuario={{ nombre: usuarioLogueado }}
            onNavegar={setIdActivo}
            onBuscar={(texto) => {
                // TODO integración: pasar `texto` como `busqueda` a nodosRepositorio.buscar().
                console.log('buscar', texto);
            }}
        >
            <div className="nodos-modulo">
                <RutaMigas
                    segmentos={rutaActual}
                    onNavegar={(id) => {
                        // TODO integración: setIdPadre(id) y recargar el listado.
                        console.log('navegar a', id);
                    }}
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
                        // TODO integración: abrir selector de archivos del sistema.
                        console.log('subir archivo');
                    }}
                    onCrearCarpeta={() => {
                        setMenuAgregarAbierto(false);
                        setModal({ tipo: 'crear' });
                    }}
                    onEliminarSeleccion={() => {
                        // TODO integración: eliminar los nodos seleccionados.
                        console.log('eliminar selección');
                    }}
                />

                {vista === 'lista' ? (
                    <TablaNodos
                        nodos={nodos}
                        onAbrir={(nodo) => console.log('abrir', nodo.id)}
                        onRenombrar={(nodo) => setModal({ tipo: 'renombrar', nodo })}
                        onEliminar={(nodo) => setModal({ tipo: 'eliminar', nodo })}
                    />
                ) : (
                    <CuadriculaNodos
                        nodos={nodos}
                        onAbrir={(nodo) => console.log('abrir', nodo.id)}
                        onRenombrar={(nodo) => setModal({ tipo: 'renombrar', nodo })}
                        onEliminar={(nodo) => setModal({ tipo: 'eliminar', nodo })}
                    />
                )}
            </div>

            {modal?.tipo === 'crear' && (
                <ModalNodo
                    titulo="Nueva carpeta"
                    onCancelar={() => setModal(null)}
                    onGuardar={(nombre) => {
                        // TODO integración: nodosRepositorio.crear({ nombre, idPadre }).
                        console.log('crear', nombre);
                        setModal(null);
                    }}
                />
            )}

            {modal?.tipo === 'renombrar' && (
                <ModalNodo
                    titulo="Renombrar"
                    valorInicial={modal.nodo.nombre}
                    onCancelar={() => setModal(null)}
                    onGuardar={(nombre) => {
                        // TODO integración: nodosRepositorio.modificar({ id: modal.nodo.id, nombre }).
                        console.log('renombrar', modal.nodo.id, nombre);
                        setModal(null);
                    }}
                />
            )}

            {modal?.tipo === 'eliminar' && (
                <ModalConfirmarEliminar
                    nombreNodo={modal.nodo.nombre}
                    onCancelar={() => setModal(null)}
                    onConfirmar={() => {
                        // TODO integración: nodosRepositorio.eliminar({ id: modal.nodo.id })
                        // y mostrar el error "la carpeta contiene elementos" si el backend lo lanza.
                        console.log('eliminar', modal.nodo.id);
                        setModal(null);
                    }}
                />
            )}
        </PlantillaLayout>
    );
}