import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUsuarioId } from "../../../lib/sesion";
import type { Perfil } from "../../types/perfil";
import { EVENTO_PERFIL_ACTUALIZADO } from "../../componentes/layout/menuUsuario";
import "../../estilos/panelPerfil.css";

export const EVENTO_ABRIR_PERFIL = "syntra:abrir-perfil";

export function PanelPerfil() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_PERFIL, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PERFIL, abrir);
  }, []);

  if (!abierto) return null;
  return <ContenidoPerfil onCerrar={() => setAbierto(false)} />;
}

function ContenidoPerfil({ onCerrar }: { onCerrar: () => void }) {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuarioId) {
      onCerrar();
      return;
    }
    window.api.obtenerPerfil({ id: usuarioId })
      .then(setPerfil)
      .catch(() => setError("No se pudo cargar el perfil."));
    window.api.obtenerFotoPerfil({ id: usuarioId })
      .then(setFoto)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, []);

  async function cambiarFoto(): Promise<void> {
    if (!usuarioId) return;
    setError("");
    try {
      const nueva = await window.api.elegirFotoPerfil({ id: usuarioId });
      if (nueva) {
        setFoto(nueva);
        window.dispatchEvent(new Event(EVENTO_PERFIL_ACTUALIZADO));
      }
    } catch {
      setError("No se pudo cambiar la foto.");
    }
  }

  function editar(): void {
    onCerrar();
    navigate("/perfil");
  }

  return (
    <div className="panel-perfil__fondo" onClick={onCerrar}>
      <div className="panel-perfil" onClick={(e) => e.stopPropagation()}>
        <div className="panel-perfil__avatar">
          {foto && <img src={foto} alt="Foto de perfil" />}
        </div>
        <button type="button" className="panel-perfil__cambiar-foto" onClick={cambiarFoto}>
          Cambiar foto
        </button>

        <span className="panel-perfil__etiqueta">Usuario</span>
        <div className="panel-perfil__campo">
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : ""}
        </div>

        <span className="panel-perfil__etiqueta">Email</span>
        <div className="panel-perfil__campo">{perfil?.email ?? ""}</div>

        <span className="panel-perfil__etiqueta">Password</span>
        <div className="panel-perfil__campo">••••••••</div>

        {error && <p className="panel-perfil__error">{error}</p>}

        <button type="button" className="panel-perfil__editar" onClick={editar}>
          Editar
        </button>
      </div>
    </div>
  );
}