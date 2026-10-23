import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { UsuarioActual } from "../../types/layout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { EVENTO_ABRIR_PERFIL } from "../../pages/perfil/panelPerfil";

interface MenuUsuarioProps {
  // Se conserva por compatibilidad con las pantallas que lo pasan; el nombre siempre sale del perfil guardado.
  usuario?: UsuarioActual;
}

// Avisa al menú que el perfil cambió para que recargue el nombre.
export const EVENTO_PERFIL_ACTUALIZADO = "perfil-actualizado";

export function MenuUsuario(_props: MenuUsuarioProps) {
  // Arranca vacío: nunca muestra un nombre fijo mientras carga el perfil real.
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    const cargar = () => {
      const id = obtenerUsuarioId();
      if (!id) {
        setNombre("");
        return;
      }
      window.api.obtenerPerfil({ id })
        .then((perfil) => setNombre(perfil.nombre))
        .catch(() => setNombre(""));
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