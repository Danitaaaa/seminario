import type { LadoDrive } from '../../types/archivo';
import '../../styles/abrirCon.css';

interface ModalConflictoDriveProps {
  nombre: string;
  onElegir: (lado: LadoDrive) => void;
  onCancelar: () => void;
}

// El documento cambió en Syntra y en Google Docs desde la última vez: se elige cuál queda antes de pisar nada.
export function ModalConflictoDrive({ nombre, onElegir, onCancelar }: ModalConflictoDriveProps) {
  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="abrir-con-modal" role="alertdialog" aria-labelledby="conflicto-drive-titulo" onClick={(e) => e.stopPropagation()}>
        <h3 id="conflicto-drive-titulo" className="abrir-con-modal__titulo">Cambió en los dos lados</h3>
        <p className="abrir-con-modal__archivo">{nombre}</p>
        <ConflictoDriveOpciones onElegir={onElegir} onCancelar={onCancelar} />
      </div>
    </div>
  );
}

// Texto y botones del conflicto, para usarlos también dentro del cartel "Abrir con".
export function ConflictoDriveOpciones({ onElegir, onCancelar }: Omit<ModalConflictoDriveProps, 'nombre'>) {
  return (
    <>
      <p className="abrir-con-modal__aviso">
        Este documento cambió en Syntra y en Google Docs. ¿Qué versión querés conservar? La otra se reemplaza.
      </p>
      <div className="abrir-con__opciones">
        <button type="button" className="abrir-con__opcion" onClick={() => onElegir('syntra')}>
          <strong>La de Syntra</strong>
          <span>Se sube a Google y reemplaza la de Docs</span>
        </button>
        <button type="button" className="abrir-con__opcion" onClick={() => onElegir('google')}>
          <strong>La de Google</strong>
          <span>Se trae a Syntra y reemplaza la de acá</span>
        </button>
      </div>
      <div className="abrir-con-modal__acciones">
        <button type="button" className="abrir-con-modal__cerrar" onClick={onCancelar}>Cancelar</button>
      </div>
    </>
  );
}
