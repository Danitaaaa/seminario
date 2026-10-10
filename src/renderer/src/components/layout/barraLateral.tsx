import type { ReactNode } from "react";
import type { ItemNavegacion as Item } from "../../types/layout";
import { ItemNavegacion } from './itemNavegacion';
import logoSyntra from "../../assets/logo-barra.png";

interface BarraLateralProps {
  items: Item[];
  itemsInferiores: Item[];
  idActivo: string;
  colapsada: boolean;
  onNavegar: (id: string) => void;
  logo?: ReactNode;
}

// Dibuja el menú que recibe
export function BarraLateral({
  items, itemsInferiores, idActivo, colapsada, onNavegar,
  logo = <img src={logoSyntra} alt="Syntra" className="app-lateral__logo-img" />,
}: BarraLateralProps) {
  const renderGrupo = (lista: Item[], extra = "") => (
    <ul className={`app-lateral__grupo ${extra}`}>
      {lista.map((item) => (
        <ItemNavegacion key={item.id} item={item} activo={item.id === idActivo} onSeleccionar={onNavegar} />
      ))}
    </ul>
  );

  return (
    <aside className={`app-lateral ${colapsada ? "app-lateral--colapsada" : ""}`}>
      <div className="app-lateral__logo">
        <span className="app-lateral__logo-texto">{logo}</span>
      </div>
      <nav aria-label="Navegación principal" style={{ display: "contents" }}>
        {renderGrupo(items)}
        {renderGrupo(itemsInferiores, "app-lateral__grupo--inferior")}
      </nav>
    </aside>
  );
}