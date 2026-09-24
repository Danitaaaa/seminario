import { useState } from "react";
import type { FormEvent } from "react";
import { Search } from "lucide-react";

interface BuscadorGlobalProps {
  onBuscar?: (texto: string) => void;
  placeholder?: string;
}

export function BuscadorGlobal({ onBuscar, placeholder = "Buscador" }: BuscadorGlobalProps) {
  const [texto, setTexto] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onBuscar?.(texto.trim());
  };

  return (
    <form className="app-buscador" role="search" onSubmit={enviar}>
      <Search size={20} aria-hidden />
      <input
        className="app-buscador__input"
        type="search"
        value={texto}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setTexto(e.target.value)}
      />
    </form>
  );
}