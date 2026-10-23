import { Boton } from '../comunes/boton';

interface ModalEliminarSesionProps {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Pide confirmación antes de eliminar una sesión. El documento Word de Material no se borra.
export function ModalEliminarSesion({ nombre, onConfirmar, onCancelar }: ModalEliminarSesionProps) {
  return (
    <div className="sesiones__overlay" onClick={onCancelar}>
      <div className="sesiones__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="sesiones__modal-titulo">Eliminar sesión</h3>
        <p className="sesiones__nota">
          ¿Seguro que querés eliminar <strong>{nombre}</strong>? Su documento Word seguirá en Material, en la carpeta
          "Sesiones de estudio".
        </p>
        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar}>Cancelar</Boton>
          <Boton onClick={onConfirmar}>Eliminar</Boton>
        </div>
      </div>
    </div>
  );
}
