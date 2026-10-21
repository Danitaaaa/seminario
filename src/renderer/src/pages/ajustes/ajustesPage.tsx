import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Monitor, Moon, Sun, UserRound, type LucideIcon } from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { usarModo, type PreferenciaModo } from "../../hooks/usarModo";
import "../../styles/ajustes.css";

const opcionesModo: { valor: PreferenciaModo; etiqueta: string; icono: LucideIcon }[] = [
  { valor: "claro", etiqueta: "Claro", icono: Sun },
  { valor: "oscuro", etiqueta: "Oscuro", icono: Moon },
  { valor: "sistema", etiqueta: "Sistema", icono: Monitor },
];

export function AjustesPage() {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();
  const { preferencia, cambiar } = usarModo();
  const [nombre, setNombre] = useState("Usuario");

  useEffect(() => {
    if (!usuarioId) {
      navigate("/");
      return;
    }
    window.api.obtenerPerfil({ id: usuarioId })
      .then((perfil) => setNombre(perfil.nombre))
      .catch(() => setNombre("Usuario"));
  }, []);

  return (
    <PlantillaLayout titulo="Ajustes" idActivo="ajustes" usuario={{ nombre }}>
      <div className="ajustes">
        <section className="ajustes__seccion">
          <h3 className="ajustes__titulo">Cuenta</h3>
          <button type="button" className="ajustes__fila" onClick={() => navigate("/perfil")}>
            <UserRound size={18} aria-hidden="true" />
            <span className="ajustes__fila-texto">Editar perfil</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </section>

        <section className="ajustes__seccion">
          <h3 className="ajustes__titulo">Apariencia</h3>
          <div className="ajustes__selector" role="radiogroup" aria-label="Modo">
            {opcionesModo.map(({ valor, etiqueta, icono: Icono }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={preferencia === valor}
                className={`ajustes__opcion${preferencia === valor ? " ajustes__opcion--activa" : ""}`}
                onClick={() => cambiar(valor)}
              >
                <Icono size={16} aria-hidden="true" />
                {etiqueta}
              </button>
            ))}
          </div>
        </section>
      </div>
    </PlantillaLayout>
  );
}