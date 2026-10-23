import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { UsuarioActual } from "../../types/layout";
import { itemsPrincipales, itemsInferiores, accionesSuperiores, rutaDe } from "../navegacion";
import { BarraLateral } from "../../components/layout/barraLateral";
import { BarraSuperior } from "../../components/layout/barraSuperior";
import { PanelAyuda } from "../../components/layout/panelAyuda";
import { cerrarSesion } from "../../../lib/sesion";

interface PlantillaLayoutProps {
  titulo: string;
  idActivo: string;
  usuario: UsuarioActual;
  onNavegar?: (id: string) => void;
  onBuscar?: (texto: string) => void;
  onAccion?: (id: string) => void;
  children: ReactNode; // el contenido propio de cada pantalla
}

// Plantilla base: barra lateral + barra superior + título + panel.
export function PlantillaLayout({
  titulo, idActivo, usuario, onNavegar, onBuscar, onAccion, children,
}: PlantillaLayoutProps) {
  const [menuColapsado, setMenuColapsado] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const navigate = useNavigate();

  // Si la pantalla no maneja la navegación, se va a la ruta del ítem.
  const navegar = onNavegar ?? ((id: string) => {
    if (id === 'cerrar-sesion') cerrarSesion();
    navigate(rutaDe(id));
  });

  // La ayuda es igual en todas las pantallas; el resto de las acciones las maneja cada pantalla.
  const accionar = (id: string) => (id === 'ayuda' ? setMostrarAyuda(true) : onAccion?.(id));

  return (
    <div className="app-shell">
      <BarraLateral
        items={itemsPrincipales}
        itemsInferiores={itemsInferiores}
        idActivo={idActivo}
        colapsada={menuColapsado}
        onNavegar={navegar}
      />
      <div className="app-principal">
        <BarraSuperior
          usuario={usuario}
          acciones={accionesSuperiores}
          onAlternarMenu={() => setMenuColapsado((v) => !v)}
          onBuscar={onBuscar}
          onAccion={accionar}
        />
        <main className="app-contenido">
          <h1 className="app-titulo">{titulo}</h1>
          <section className="app-panel">{children}</section>
        </main>
      </div>
      {mostrarAyuda && <PanelAyuda onCerrar={() => setMostrarAyuda(false)} />}
    </div>
  );
}