import { useEffect, useState } from 'react';
import icono from '../../assets/splash-icono.png?inline';
import texto from '../../assets/splash-texto.png?inline';
import { colorearLogo, leerToken } from '../../utils/colorearIconos';
import './splashScreen.css';

interface Props {
  onFinish: () => void;
  duracion?: number;
}

// Pasa el logo a los colores de la paleta activa. Si falla, queda el original.
function colorear(origen: string): Promise<string> {
  return colorearLogo(
    leerToken('--color-lateral-texto', '#FFFFFF'),
    leerToken('--color-splash-brillo', '#8BA3C5'),
    origen,
  ).catch(() => origen);
}

export function SplashScreen({ onFinish, duracion = 8000 }: Props) {
  const [imagenes, setImagenes] = useState<{ icono: string; texto: string } | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([colorear(icono), colorear(texto)]).then(([i, t]) => {
      if (vigente) setImagenes({ icono: i, texto: t });
    });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(onFinish, duracion);
    return () => clearTimeout(t);
  }, [onFinish, duracion]);

  // Las imágenes aparecen recién coloreadas, así no se ve un salto de color.
  return (
    <div className="splash">
      {imagenes && (
        <div className="splash-contenido">
          <img src={imagenes.icono} alt="" className="splash-icono" />
          <img src={imagenes.texto} alt="Syntra" className="splash-texto" />
        </div>
      )}
    </div>
  );
}