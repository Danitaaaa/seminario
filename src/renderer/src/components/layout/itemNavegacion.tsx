import type { ItemNavegacion as Item } from "../../types/layout";
import { useVoice } from "../../hooks/useVoice";
import { rutaDe } from "../../pages/navegacion";
import { esSeccionSinVoz } from "../../voz/narrador";

interface ItemNavegacionProps {
  item: Item;
  activo: boolean;
  onSeleccionar: (id: string) => void;
}

export function ItemNavegacion({ item, activo, onSeleccionar }: ItemNavegacionProps) {
  const Icono = item.icono;
  // Con modo voz, las secciones que no son accesibles por voz no se alcanzan con el teclado.
  const sinVoz = useVoice().modoVoz === true && esSeccionSinVoz(rutaDe(item.id));
  return (
    <li aria-hidden={sinVoz || undefined}>
      <button
        type="button"
        className={`app-nav ${activo ? "app-nav--activo" : ""}`}
        aria-current={activo ? "page" : undefined}
        title={item.etiqueta}
        onClick={() => onSeleccionar(item.id)}
        tabIndex={sinVoz ? -1 : undefined}
      >
        <Icono className="app-nav__icono" size={20} />
        <span className="app-nav__etiqueta">{item.etiqueta}</span>
      </button>
    </li>
  );
}