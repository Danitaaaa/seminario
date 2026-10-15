import type { ButtonHTMLAttributes } from "react";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "contorno";
}

// Botón estándar de la app (ej.: "Editar" = primario, "Eliminar" = contorno).
export function Boton({ variante = "primario", className = "", ...resto }: BotonProps) {
  return <button type="button" className={`app-boton app-boton--${variante} ${className}`} {...resto} />;
}