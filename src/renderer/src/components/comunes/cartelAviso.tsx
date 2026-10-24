import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type TipoAviso = 'exito' | 'error' | 'info';

interface CartelAvisoProps {
  tipo: TipoAviso;
  mensaje: string;
  onCerrar: () => void;
}

const ICONO = { exito: CheckCircle2, error: TriangleAlert, info: Info };

// Cartel flotante de confirmación o error. Lo administra ProveedorAvisos (hooks/usarAvisos).
export function CartelAviso({ tipo, mensaje, onCerrar }: CartelAvisoProps) {
  const Icono = ICONO[tipo];
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono size={18} className="aviso__icono" aria-hidden="true" />
      <span className="aviso__mensaje">{mensaje}</span>
      <button type="button" className="aviso__cerrar" aria-label="Cerrar" onClick={onCerrar}>
        <X size={14} />
      </button>
    </div>
  );
}
