import { Boton } from '../comunes/boton';

interface ModalConfirmarEliminarProps {
    nombreNodo: string;
    onConfirmar: () => void;
    onCancelar: () => void;
}

// Responsabilidad única: pedir confirmación. No sabe cómo se elimina el nodo
// ni qué pasa si el backend rechaza el borrado (eso lo maneja quien la usa).
export function ModalConfirmarEliminar({ nombreNodo, onConfirmar, onCancelar }: ModalConfirmarEliminarProps) {
    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal__titulo">Eliminar carpeta</h3>
                <p className="modal__texto">
                    ¿Seguro que querés eliminar <strong>{nombreNodo}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="modal__acciones">
                    <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
                    <Boton variante="peligro" onClick={onConfirmar}>Eliminar</Boton>
                </div>
            </div>
        </div>
    );
}
