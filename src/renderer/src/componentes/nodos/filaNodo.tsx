import { useState } from 'react';
import type { MouseEvent, DragEvent } from 'react';
import type { Nodo } from '../../types/nodo';
import { Icono } from '../comunes/icono';
import { IconoAccion } from '../comunes/iconoAccion';
import { MenuAccionesNodo } from './menuAccionesNodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import { formatearFecha } from '../../utils/formatearFecha';
import { formatearTamaño } from '../../utils/formatearTamaño';
import iconoMore from '../../assets/icons/more.svg';

interface FilaNodoProps {
    nodo: Nodo;
    seleccionado: boolean;
    sobreDestino: boolean;
    onSeleccionar: (nodo: Nodo, evento: MouseEvent) => void;
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
    onArrastrarInicio: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onArrastrarSobre: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSoltar: (nodo: Nodo, evento: DragEvent<HTMLDivElement>) => void;
    onSalirDestino: () => void;
}

// La selección ahora es la fila resaltada (no un checkbox): un click la
// selecciona (con Ctrl/Cmd para sumar y Shift para rango) y un doble click
// abre el nodo. Las carpetas además actúan como destino al soltar, lo que
// permite mover la selección arrastrándola encima.
export function FilaNodo({
    nodo, seleccionado, sobreDestino,
    onSeleccionar, onAbrir, onRenombrar, onEliminar,
    onArrastrarInicio, onArrastrarSobre, onSoltar, onSalirDestino,
}: FilaNodoProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const { icono, tipo } = resolverIconoNodo(nodo.nombre, nodo.tipo === 'carpeta');
    const esCarpeta = nodo.tipo === 'carpeta';

    return (
        <div
            className={`fila-nodo${seleccionado ? ' fila-nodo--seleccionada' : ''}${sobreDestino ? ' fila-nodo--sobre-destino' : ''}`}
            role="row"
            draggable
            onClick={(e) => { e.stopPropagation(); onSeleccionar(nodo, e); }}
            onDoubleClick={() => onAbrir(nodo)}
            onDragStart={(e) => onArrastrarInicio(nodo, e)}
            onDragOver={(e) => { if (esCarpeta) { e.preventDefault(); onArrastrarSobre(nodo, e); } }}
            onDragLeave={() => esCarpeta && onSalirDestino()}
            onDrop={(e) => { if (esCarpeta) { e.preventDefault(); onSoltar(nodo, e); } }}
        >
            <span className="fila-nodo__nombre">
                <Icono src={icono} tamaño={20} />
                <span>{nodo.nombre}</span>
            </span>
            <span className="fila-nodo__celda">{tipo}</span>
            <span className="fila-nodo__celda">{formatearTamaño(Number(nodo.tamaño))}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.fechaDeCarga)}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.ultimaFechaModificacion)}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.ultimaFechaAcceso)}</span>

            <div className="fila-nodo__menu-contenedor" onClick={(e) => e.stopPropagation()}>
                <IconoAccion icono={iconoMore} alt="Más acciones" onClick={() => setMenuAbierto((v) => !v)} />
                <MenuAccionesNodo
                    abierto={menuAbierto}
                    onRenombrar={() => { setMenuAbierto(false); onRenombrar(nodo); }}
                    onEliminar={() => { setMenuAbierto(false); onEliminar(nodo); }}
                />
            </div>
        </div>
    );
}