import { AVATARES, PREFIJO_AVATAR } from "./avatares";
import { DibujoAvatar } from "./fotoPerfil";

interface Props {
  actual: string | null;
  onElegir: (id: string) => void;
}

// Grilla de avatares. Con el modo voz se recorre con las flechas (data-voz-grupo).
export function ElegirAvatar({ actual, onElegir }: Props) {
  return (
    <div className="elegir-avatar" role="group" aria-label="Avatares de Syntra" data-voz-grupo>
      {AVATARES.map((a) => {
        const elegido = actual === PREFIJO_AVATAR + a.id;
        return (
          <button
            key={a.id}
            type="button"
            className={`elegir-avatar__opcion${elegido ? " elegir-avatar__opcion--elegido" : ""}`}
            aria-label={a.nombre}
            aria-pressed={elegido}
            title={a.nombre}
            onClick={() => onElegir(a.id)}
          >
            <DibujoAvatar avatar={a} decorativo />
          </button>
        );
      })}
    </div>
  );
}
