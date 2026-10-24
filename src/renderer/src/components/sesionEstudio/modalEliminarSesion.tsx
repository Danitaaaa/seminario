import { ModalConfirmar } from './modalConfirmar';

interface ModalEliminarSesionProps {
  // Nombres de las sesiones a eliminar (una o varias seleccionadas).
  nombres: string[];
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Pide confirmación antes de eliminar una o varias sesiones. Sus documentos Word quedan en Material.
export function ModalEliminarSesion({ nombres, onConfirmar, onCancelar }: ModalEliminarSesionProps) {
  const varias = nombres.length > 1;
  return (
    <ModalConfirmar
      titulo={varias ? 'Eliminar sesiones' : 'Eliminar sesión'}
      mensaje={
        <>
          ¿Seguro que querés eliminar {varias ? <strong>{nombres.length} sesiones</strong> : <strong>{nombres[0]}</strong>}?{' '}
          {varias ? 'Sus documentos Word seguirán' : 'Su documento Word seguirá'} en Material, en la carpeta
          "Sesiones de estudio".
        </>
      }
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
}
