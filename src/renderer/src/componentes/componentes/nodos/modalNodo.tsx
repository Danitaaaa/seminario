import { useState } from 'react';
import { Boton } from '../comunes/boton';

interface ModalNodoProps {
    titulo: string;
    valorInicial?: string;
    onGuardar: (nombre: string) => void;
    onCancelar: () => void;
}

// Un único formulario sirve tanto para "crear carpeta" (valorInicial vacío)
// como para "renombrar" (valorInicial = nombre actual). No decide qué hacer
// con el nombre final: solo lo entrega a onGuardar.
export function ModalNodo({ titulo, valorInicial = '', onGuardar, onCancelar }: ModalNodoProps) {
    const [nombre, setNombre] = useState(valorInicial);

    const confirmar = () => {
        const limpio = nombre.trim();
        if (limpio) onGuardar(limpio);
    };

    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal__titulo">{titulo}</h3>
                <input
                    className="modal__input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmar()}
                    autoFocus
                    maxLength={250}
                />
                <div className="modal__acciones">
                    <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
                    <Boton onClick={confirmar}>Guardar</Boton>
                </div>
            </div>
        </div>
    );
}
