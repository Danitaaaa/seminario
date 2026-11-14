import { useId } from "react";
import { buscarAvatar, type Avatar } from "./avatares";
import "../../styles/avatares.css";

// Dibuja un avatar de Syntra con los colores de la paleta actual.
export function DibujoAvatar({ avatar, decorativo = false }: { avatar: Avatar; decorativo?: boolean }) {
  // Cada SVG necesita su propio recorte para no pisarse con otro avatar en la misma pantalla.
  const recorte = `avatar-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className="avatar-syntra"
      viewBox="-40 -40 80 80"
      role={decorativo ? undefined : "img"}
      aria-label={decorativo ? undefined : `Avatar ${avatar.nombre}`}
      aria-hidden={decorativo || undefined}
      dangerouslySetInnerHTML={{ __html: avatar.dibujo.replace('id="cl"', `id="${recorte}"`).replace("url(#cl)", `url(#${recorte})`) }}
    />
  );
}

// Muestra la foto de perfil: un avatar de Syntra ("avatar:gato") o una imagen subida.
export function FotoPerfil({ foto, className }: { foto: string | null; className?: string }) {
  const avatar = buscarAvatar(foto);
  if (avatar) return <DibujoAvatar avatar={avatar} />;
  return foto ? <img src={foto} alt="Foto de perfil" className={className} /> : null;
}
