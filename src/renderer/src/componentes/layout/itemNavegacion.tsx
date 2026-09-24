import type { ItemNavegacion as Item } from "../../types/layout";

interface ItemNavegacionProps {
  item: Item;
  activo: boolean;
  onSeleccionar: (id: string) => void;
}

export function ItemNavegacion({ item, activo, onSeleccionar }: ItemNavegacionProps) {
  const Icono = item.icono;
  return (
    <li>
      <button
        type="button"
        className={`app-nav ${activo ? "app-nav--activo" : ""}`}
        aria-current={activo ? "page" : undefined}
        title={item.etiqueta}
        onClick={() => onSeleccionar(item.id)}
      >
        <Icono className="app-nav__icono" size={20} />
        <span className="app-nav__etiqueta">{item.etiqueta}</span>
      </button>
    </li>
  );
}