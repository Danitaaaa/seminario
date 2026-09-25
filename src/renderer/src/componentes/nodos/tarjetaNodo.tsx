import { useState } from 'react';
import type { Nodo } from '../../types/nodo';
import { Icono } from '../comunes/icono';
import { IconoAccion } from '../comunes/iconoAccion';
import { MenuAccionesNodo } from './menuAccionesNodo';
import { resolverIconoNodo } from '../../utils/iconoNodo';
import iconoMore from '../../assets/icons/more.svg';

interface TarjetaNodoProps {
    nodo: Nodo;
    onAbrir: (nodo: Nodo) => void;
    onRenombrar: (nodo: Nodo) => void;
    onEliminar: (nodo: Nodo) => void;
}

// Misma responsabilidad que FilaNodo pero para la vista cuadrícula: dibuja una
// tarjeta y delega toda acción hacia arriba. Comparte MenuAccionesNodo con la fila.
export function TarjetaNodo({ nodo, onAbrir, onRenombrar, onEliminar }: TarjetaNodoProps) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const { icono } = resolverIconoNodo(nodo.nombre, true);

    return (
        <div className="tarjeta-nodo" onDoubleClick={() => onAbrir(nodo)}>
            <div className="tarjeta-nodo__menu-contenedor">
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
