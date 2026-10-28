import type { ReactNode } from 'react';
import { Boton } from '../comunes/boton';

interface ModalConfirmarEliminarProps {
    // Título del modal. Por defecto "Eliminar carpeta".
    titulo?: string;
    // Mensaje personalizado. Si no viene, se arma con `nombreNodo`.
    mensaje?: ReactNode;
    // Atajo para el caso de carpetas: "¿Seguro que querés eliminar <nombre>?"
    nombreNodo?: string;
    onConfirmar: () => void;
    onCancelar: () => void;
}

// Responsabilidad única: pedir confirmación. No sabe cómo se elimina lo que se confirma
// ni qué pasa si el backend rechaza el borrado (eso lo maneja quien la usa).
export function ModalConfirmarEliminar({
    titulo = 'Eliminar carpeta',
    mensaje,
    nombreNodo,
    onConfirmar,
    onCancelar,
}: ModalConfirmarEliminarProps) {
    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal__titulo">{titulo}</h3>
                <p className="modal__texto">
                    {mensaje ?? (
                        <>
                            ¿Seguro que querés eliminar <strong>{nombreNodo}</strong>? Esta acción no se
                            puede deshacer.
                        </>
                    )}
                </p>
                <div className="modal__acciones">
                    <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
                    <Boton variante="peligro" onClick={onConfirmar}>Eliminar</Boton>
                </div>
            </div>
        </div>
    );
}