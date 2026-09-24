import { Menu } from "lucide-react";
import type { AccionSuperior, UsuarioActual } from "../../types/layout";
import { BotonIcono } from "../comunes/botonIcono";
import { BuscadorGlobal } from "./buscadorGlobal";
import { MenuUsuario } from "./menuUsuario";

interface BarraSuperiorProps {
  usuario: UsuarioActual;
  acciones: AccionSuperior[];
  onAlternarMenu: () => void;
  onBuscar?: (texto: string) => void;
  onAccion?: (id: string) => void;
}

export function BarraSuperior({ usuario, acciones, onAlternarMenu, onBuscar, onAccion }: BarraSuperiorProps) {
  return (
    <header className="app-superior">
      <BotonIcono icono={Menu} etiqueta="Mostrar u ocultar menú" plano onClick={onAlternarMenu} />
      <BuscadorGlobal onBuscar={onBuscar} />
      <div className="app-superior__espaciador" />
      <div className="app-superior__acciones">
        {acciones.map((a) => (
          <BotonIcono key={a.id} icono={a.icono} etiqueta={a.etiqueta} onClick={() => onAccion?.(a.id)} />
        ))}
      </div>
      <MenuUsuario usuario={usuario} />
    </header>
  );
}