import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Search } from "lucide-react";

interface BuscadorGlobalProps {
  onBuscar?: (texto: string) => void;
  placeholder?: string;
  demoraMs?: number;
}

export function BuscadorGlobal({ onBuscar, placeholder = "Buscador", demoraMs = 300 }: BuscadorGlobalProps) {
  const [texto, setTexto] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Búsqueda en vivo con debounce: cada cambio reinicia el timer, así no se
  // dispara una consulta por cada tecla. Al desmontar se limpia el timer
  // pendiente para no llamar a onBuscar sobre un componente ya destruido.
  useEffect(() => {
    temporizador.current = setTimeout(() => {
      onBuscar?.(texto.trim());
    }, demoraMs);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [texto, demoraMs, onBuscar]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    // Enter dispara la búsqueda al instante, sin esperar el debounce.
    if (temporizador.current) clearTimeout(temporizador.current);
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