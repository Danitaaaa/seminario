import { CSSProperties, useEffect } from 'react';
import { colores } from '../../estilos/colores';
import icono from '../../assets/splash-icono.png';
import texto from '../../assets/splash-texto.png';
import './SplashScreen.css';

interface Props {
  onFinish: () => void;
  duracion?: number;
}

export function SplashScreen({ onFinish, duracion = 8000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onFinish, duracion);
    return () => clearTimeout(t);
  }, [onFinish, duracion]);

  const vars = {
    '--fondo': colores.steel,
    '--brillo': colores.frostBlue,
  } as CSSProperties;

  return (
    <div className="splash" style={vars}>
      <div className="splash-contenido">
        <img src={icono} alt="" className="splash-icono" />
        <img src={texto} alt="Syntra" className="splash-texto" />
      </div>
    </div>
  );
}