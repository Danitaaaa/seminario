import type { LucideIcon } from "lucide-react";

interface BotonIconoProps {
  icono: LucideIcon;
  etiqueta: string; // Texto accesible (lectores de pantalla)
  onClick?: () => void;
  plano?: boolean; // Sin fondo
}

export function BotonIcono({ icono: Icono, etiqueta, onClick, plano = false }: BotonIconoProps) {
  return (
    <button
      type="button"
      className={`app-boton-icono ${plano ? "app-boton-icono--plano" : ""}`}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
    >
      <Icono size={20} />
    </button>
  );
}