import { useState } from "react";
import type { ReactNode } from "react";
import type { UsuarioActual } from "../../types/layout";
import { itemsPrincipales, itemsInferiores, accionesSuperiores } from "../navegacion";
import { BarraLateral } from "../../componentes/layout/barraLateral";
import { BarraSuperior } from "../../componentes/layout/barraSuperior";

interface PlantillaLayoutProps {
  titulo: string;
  idActivo: string;
  usuario: UsuarioActual;
  onNavegar: (id: string) => void;
  onBuscar?: (texto: string) => void;
  onAccion?: (id: string) => void;
  children: ReactNode; // el contenido propio de cada pantalla
}

// Plantilla base: barra lateral + barra superior + título + panel.
export function PlantillaLayout({
  titulo, idActivo, usuario, onNavegar, onBuscar, onAccion, children,
}: PlantillaLayoutProps) {
  const [menuColapsado, setMenuColapsado] = useState(false);

  return (
    <div className="app-shell">
      <BarraLateral
        items={itemsPrincipales}
        itemsInferiores={itemsInferiores}
        idActivo={idActivo}
        colapsada={menuColapsado}
        onNavegar={onNavegar}
      />
      <div className="app-principal">
        <BarraSuperior
          usuario={usuario}
          acciones={accionesSuperiores}
          onAlternarMenu={() => setMenuColapsado((v) => !v)}
          onBuscar={onBuscar}
          onAccion={onAccion}
        />
        <main className="app-contenido">
          <h1 className="app-titulo">{titulo}</h1>
          <section className="app-panel">{children}</section>
        </main>
      </div>
    </div>
  );
}