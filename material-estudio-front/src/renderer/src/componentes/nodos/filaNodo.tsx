import { useState } from 'react';
import type { Nodo } from '../../types/nodo';
import { Icono } from '../comunes/icono';
import { IconoAccion } from '../comunes/iconoAccion';
import { MenuAccionesNodo } from './menuAccionesNodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import { formatearFecha } from '../../utils/formatearFecha';
import { formatearTamaño } from '../../utils/formatearTamaño';
import iconoMore from '../../assets/icons1/more.svg';

interface FilaNodoProps {
    nodo: Nodo;
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
}

// Solo dibuja una fila y delega toda acción hacia arriba vía props.
// El único estado que maneja localmente es si su propio menú de "..." está abierto.
export function FilaNodo({ nodo, onAbrir, onRenombrar, onEliminar }: FilaNodoProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const { icono, tipo } = resolverIconoNodo(nodo.nombre, true);

    return (
        <div className="fila-nodo" role="row">
            <button type="button" className="fila-nodo__nombre" onDoubleClick={() => onAbrir(nodo)}>
                <Icono src={icono} tamaño={20} />
                <span>{nodo.nombre}</span>
            </button>
            <span className="fila-nodo__celda">{tipo}</span>
            <span className="fila-nodo__celda">{formatearTamaño(Number(nodo.tamaño))}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.fechaDeCarga)}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.ultimaFechaModificacion)}</span>
            <span className="fila-nodo__celda">{formatearFecha(nodo.ultimaFechaAcceso)}</span>

            <div className="fila-nodo__menu-contenedor">
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
