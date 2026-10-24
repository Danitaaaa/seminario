import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, List, ListChecks, Monitor, Moon, NotebookPen, Sun, UserRound, type LucideIcon,
} from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { obtenerUsuarioId } from "../../../lib/sesion";
import { usarModo, type PreferenciaModo } from "../../hooks/usarModo";
import { usarPreferenciaMetas, type EstiloMetas, type MostrarMetas } from "../../hooks/usarPreferenciaMetas";
import { PALETAS } from "../../styles/temas/paletas";
import "../../styles/ajustes.css";

const opcionesModo: { valor: PreferenciaModo; etiqueta: string; icono: LucideIcon }[] = [
  { valor: "claro", etiqueta: "Claro", icono: Sun },
  { valor: "oscuro", etiqueta: "Oscuro", icono: Moon },
  { valor: "sistema", etiqueta: "Sistema", icono: Monitor },
];

const estilosMetas: { valor: EstiloMetas; etiqueta: string; icono: LucideIcon }[] = [
  { valor: "completa", etiqueta: "Completa", icono: ListChecks },
  { valor: "minimalista", etiqueta: "Minimalista", icono: List },
  { valor: "cuaderno", etiqueta: "Cuaderno", icono: NotebookPen },
];

const opcionesMostrar: { valor: keyof MostrarMetas; etiqueta: string }[] = [
  { valor: "fechas", etiqueta: "Fechas" },
  { valor: "contador", etiqueta: "Contador (3 de 5)" },
  { valor: "progreso", etiqueta: "Barra de progreso" },
];

export function AjustesPage() {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();
  const { preferencia, cambiar, paleta, cambiarPaleta } = usarModo();
  const { estilo, mostrar, cambiarEstilo, cambiarMostrar } = usarPreferenciaMetas();
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

          <p className="ajustes__subtitulo">Modo</p>
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

          <p className="ajustes__subtitulo">Paleta</p>
          <div className="ajustes__paletas" role="radiogroup" aria-label="Paleta">
            {PALETAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={paleta === p.id}
                className={`ajustes__paleta${paleta === p.id ? " ajustes__paleta--activa" : ""}`}
                onClick={() => cambiarPaleta(p.id)}
              >
                <span
                  className="ajustes__muestra"
                  style={{
                    background: `linear-gradient(135deg, ${p.modos.claro.lateralFondo} 50%, ${p.modos.claro.accent} 50%)`,
                  }}
                />
                <span>{p.nombre}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ajustes__seccion">
          <h3 className="ajustes__titulo">Inicio</h3>

          <p className="ajustes__subtitulo">Estilo de "Mis metas"</p>
          <div className="ajustes__selector" role="radiogroup" aria-label="Estilo de las metas">
            {estilosMetas.map(({ valor, etiqueta, icono: Icono }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={estilo === valor}
                className={`ajustes__opcion${estilo === valor ? " ajustes__opcion--activa" : ""}`}
                onClick={() => cambiarEstilo(valor)}
              >
                <Icono size={16} aria-hidden="true" />
                {etiqueta}
              </button>
            ))}
          </div>

          {estilo === "completa" && (
            <>
              <p className="ajustes__subtitulo">Mostrar</p>
              <div className="ajustes__checks">
                {opcionesMostrar.map(({ valor, etiqueta }) => (
                  <label key={valor} className="ajustes__check">
                    <input
                      type="checkbox"
                      checked={mostrar[valor]}
                      onChange={(e) => cambiarMostrar(valor, e.target.checked)}
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </PlantillaLayout>
  );
}