import { useRef } from 'react';
import iconoPlus from '../../assets/icons/plus.svg';
import iconoChevronDown from '../../assets/icons/chevron-down.svg';
import iconoTrash from '../../assets/icons/trash.svg';
import iconoGrid from '../../assets/icons/grid.svg';
import iconoList from '../../assets/icons/list.svg';
import { Icono } from '../comunes/icono';
import { IconoAccion } from '../comunes/iconoAccion';
import { ColumnaOrden } from './columnaOrden';
import { MenuAgregar } from './menuAgregar';
import type { Direccion, OrdenarPor, VistaListado } from '../../types/vistaNodos';

interface ColumnaConfig {
    etiqueta: string;
    campo?: OrdenarPor;
}

const COLUMNAS: ColumnaConfig[] = [
    { etiqueta: 'Nombre', campo: 'nombre' },
    { etiqueta: 'tipo' },
    { etiqueta: 'tamaño', campo: 'tamaño' },
    { etiqueta: 'fecha de carga', campo: 'fecha_carga' },
    { etiqueta: 'última fecha modificación', campo: 'fecha_ultima_modificacion' },
    { etiqueta: 'última fecha acceso', campo: 'fecha_ultimo_acceso' },
];

interface BarraFiltrosNodosProps {
    ordenActivo: OrdenarPor;
    direccion: Direccion;
    onOrdenar: (campo: OrdenarPor) => void;
    vista: VistaListado;
    onCambiarVista: (vista: VistaListado) => void;
    menuAgregarAbierto: boolean;
    onToggleMenuAgregar: () => void;
    onSubirArchivo: () => void;
    onCrearCarpeta: () => void;
    onEliminarSeleccion: () => void;
    haySeleccion?: boolean;
}

// Compone las columnas ordenables + las acciones de la derecha (agregar, eliminar,
// cambiar vista). No sabe de dónde vienen los datos ni cómo se persiste el orden:
// solo informa la intención del usuario a través de las props.
export function BarraFiltrosNodos({
    ordenActivo, direccion, onOrdenar,
    vista, onCambiarVista,
    menuAgregarAbierto, onToggleMenuAgregar, onSubirArchivo, onCrearCarpeta,
    onEliminarSeleccion, haySeleccion = false,
}: BarraFiltrosNodosProps) {
    const contenedorMenuRef = useRef<HTMLDivElement>(null);

    return (
        <div className="barra-filtros">
            <div className="barra-filtros__columnas">
                {COLUMNAS.map((columna) => (
                    <ColumnaOrden
                        key={columna.etiqueta}
                        etiqueta={columna.etiqueta}
                        campo={columna.campo}
                        ordenActivo={ordenActivo}
                        direccion={direccion}
                        onOrdenar={onOrdenar}
                    />
                ))}
            </div>

            <div className="barra-filtros__acciones">
                <div className="barra-filtros__menu-contenedor" ref={contenedorMenuRef}>
                    <button type="button" className="boton-agregar" onClick={onToggleMenuAgregar}>
                        <Icono src={iconoPlus} tamaño={16} />
                        <Icono src={iconoChevronDown} tamaño={14} />
                    </button>
                    <MenuAgregar
                        abierto={menuAgregarAbierto}
                        onSubirArchivo={onSubirArchivo}
                        onCrearCarpeta={onCrearCarpeta}
                    />
                </div>

                <IconoAccion
                    icono={iconoTrash}
                    alt="Eliminar seleccionados"
                    deshabilitado={!haySeleccion}
                    onClick={onEliminarSeleccion}
                />
                <IconoAccion
                    icono={iconoGrid}
                    alt="Ver en cuadrícula"
                    activo={vista === 'cuadricula'}
                    onClick={() => onCambiarVista('cuadricula')}
                />
                <IconoAccion
                    icono={iconoList}
                    alt="Ver en lista"
                    activo={vista === 'lista'}
                    onClick={() => onCambiarVista('lista')}
                />
            </div>
        </div>
    );
}
