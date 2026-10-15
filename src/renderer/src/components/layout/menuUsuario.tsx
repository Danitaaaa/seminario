import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { UsuarioActual } from "../../types/layout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { EVENTO_ABRIR_PERFIL } from "../../pages/perfil/panelPerfil";

interface MenuUsuarioProps {
  usuario: UsuarioActual;
}

// Avisa al menú que el perfil cambió para que recargue el nombre.
export const EVENTO_PERFIL_ACTUALIZADO = "perfil-actualizado";

export function MenuUsuario({ usuario }: MenuUsuarioProps) {
  const [nombre, setNombre] = useState(usuario.nombre);

  useEffect(() => {
    const cargar = () => {
      const id = obtenerUsuarioId();
      if (!id) return;
      window.api.obtenerPerfil({ id })
        .then((perfil) => setNombre(perfil.nombre))
        .catch(() => {});
    };

    cargar();
    window.addEventListener(EVENTO_PERFIL_ACTUALIZADO, cargar);
    return () => window.removeEventListener(EVENTO_PERFIL_ACTUALIZADO, cargar);
  }, []);

  return (
    <button
      type="button"
      className="app-usuario"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_PERFIL))}
      aria-label="Editar perfil"
    >
      <span className="app-usuario__datos">
        <span className="app-usuario__nombre">{nombre}</span>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}