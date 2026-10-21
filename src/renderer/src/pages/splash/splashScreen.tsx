import { useEffect } from 'react';
import icono from '../../assets/splash-icono.png';
import texto from '../../assets/splash-texto.png';
import './splashScreen.css';

interface Props {
  onFinish: () => void;
  duracion?: number;
}

export function SplashScreen({ onFinish, duracion = 8000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onFinish, duracion);
    return () => clearTimeout(t);
  }, [onFinish, duracion]);

  return (
    <div className="splash">
      <div className="splash-contenido">
        <img src={icono} alt="" className="splash-icono" />
        <img src={texto} alt="Syntra" className="splash-texto" />
      </div>
    </div>
  );
}