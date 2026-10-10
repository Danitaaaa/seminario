import { ChevronDown } from "lucide-react";
import type { UsuarioActual } from "../../types/layout";

interface MenuUsuarioProps {
  usuario: UsuarioActual;
  onClick?: () => void; // Abrir el desplegable (falta implementar)
}

export function MenuUsuario({ usuario, onClick }: MenuUsuarioProps) {
  return (
    <button type="button" className="app-usuario" onClick={onClick} aria-label="Menú de usuario">
      <span className="app-usuario__datos">
        <span className="app-usuario__nombre">{usuario.nombre}</span>
      </span>
      <ChevronDown size={18} aria-hidden />
    </button>
  );
}