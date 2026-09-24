import type { LucideIcon } from "lucide-react";

// Un elemento clicable de la barra lateral.
export interface ItemNavegacion {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
}

// Un botón de icono de la barra superior (ayuda, mensajes, notificaciones...).
export interface AccionSuperior {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
}

export interface UsuarioActual {
  nombre: string;
}