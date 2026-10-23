import { useEffect, useState } from "react";
import { colorearLogo, leerToken, logoSrc } from "../../utils/colorearIconos";

// Evento que dispara usarModo cuando cambia el modo o la paleta.
const EVENTO_APARIENCIA = "syntra:apariencia-cambiada";

// Logo de la barra lateral, recoloreado con la paleta activa.
export function LogoSyntra() {
  const [src, setSrc] = useState<string>(logoSrc);

  useEffect(() => {
    let vigente = true;

    const actualizar = () => {
      // Se usan los colores de la barra lateral para que el logo se lea sobre su fondo.
      colorearLogo(
        leerToken("--color-lateral-texto", "#FFFFFF"),
        leerToken("--color-primary-light", "#8BA3C5"),
      )
        .then((url) => { if (vigente) setSrc(url); })
        .catch(() => { /* si falla, queda el logo original */ });
    };

    actualizar();
    window.addEventListener(EVENTO_APARIENCIA, actualizar);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO_APARIENCIA, actualizar);
    };
  }, []);

  return <img src={src} alt="Syntra" className="app-lateral__logo-img" />;
}