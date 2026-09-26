import { useState } from 'react';
import type { MouseEvent, DragEvent } from 'react';
import type { Nodo } from '../../types/nodo';
import { Icono } from '../comunes/icono';
import { IconoAccion } from '../comunes/iconoAccion';
import { MenuAccionesNodo } from './menuAccionesNodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import iconoMore from '../../assets/icons/more.svg';

interface TarjetaNodoProps {
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

// Misma lógica de selección/arrastre que FilaNodo, pero para la vista cuadrícula.
export function TarjetaNodo({
    nodo, seleccionado, sobreDestino,
    onSeleccionar, onAbrir, onRenombrar, onEliminar,
    onArrastrarInicio, onArrastrarSobre, onSoltar, onSalirDestino,
}: TarjetaNodoProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const { icono } = resolverIconoNodo(nodo.nombre, nodo.tipo === 'carpeta');
    const esCarpeta = nodo.tipo === 'carpeta';

    return (
        <div
            className={`tarjeta-nodo${seleccionado ? ' tarjeta-nodo--seleccionada' : ''}${sobreDestino ? ' tarjeta-nodo--sobre-destino' : ''}`}
            draggable
            onClick={(e) => { e.stopPropagation(); onSeleccionar(nodo, e); }}
            onDoubleClick={() => onAbrir(nodo)}
            onDragStart={(e) => onArrastrarInicio(nodo, e)}
            onDragOver={(e) => { if (esCarpeta) { e.preventDefault(); onArrastrarSobre(nodo, e); } }}
            onDragLeave={() => esCarpeta && onSalirDestino()}
            onDrop={(e) => { if (esCarpeta) { e.preventDefault(); onSoltar(nodo, e); } }}
        >
            <div className="tarjeta-nodo__menu-contenedor" onClick={(e) => e.stopPropagation()}>
                <IconoAccion icono={iconoMore} alt="Más acciones" onClick={() => setMenuAbierto((v) => !v)} />
                <MenuAccionesNodo
                    abierto={menuAbierto}
                    onRenombrar={() => { setMenuAbierto(false); onRenombrar(nodo); }}
                    onEliminar={() => { setMenuAbierto(false); onEliminar(nodo); }}
                />
            </div>

            <Icono src={icono} tamaño={64} alt={nodo.nombre} />
            <span className="tarjeta-nodo__nombre">{nodo.nombre}</span>
        </div>
    );
}