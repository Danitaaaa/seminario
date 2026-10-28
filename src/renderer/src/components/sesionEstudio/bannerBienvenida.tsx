import { useNavigate } from 'react-router-dom';
import type { SesionEstudio, SnapshotSesionEnCurso } from '../../types/sesionesEstudio';
import { AnilloProgreso } from './anilloProgreso';
import { formatearDiaHora, formatearFechaLarga, formatearTiempo } from '../../pages/sesionesEstudio/utilidades';

interface BannerBienvenidaProps {
  nombreUsuario: string;
  proxima: SesionEstudio | null;
  enCurso: SesionEstudio | null;
  snapshot: SnapshotSesionEnCurso | null;
}

// Cartel de arriba de la pestaña de sesiones: saludo, qué sesión sigue y un anillo con su Pomodoro.
// Si hay una sesión en curso, la muestra a ella y el anillo cuenta en vivo.
export function BannerBienvenida({ nombreUsuario, proxima, enCurso, snapshot }: BannerBienvenidaProps) {
  const navigate = useNavigate();
  const saludo = nombreUsuario ? `¡Hola, ${nombreUsuario}!` : '¡Hola!';

  let texto: string;
  let boton: { etiqueta: string; ruta: string };
  let segundos: number | null = null;
  let progreso = 1;

  if (enCurso) {
    texto = `Tenés una sesión ${enCurso.pausada ? 'pausada' : 'en curso'}: ${enCurso.nombre} (${enCurso.materiaAsociada.nombre}).`;
    boton = { etiqueta: 'Volver a la sesión →', ruta: `/sesiones/${enCurso.idSesion}` };
    if (snapshot && snapshot.idSesion === enCurso.idSesion) {
      segundos = snapshot.pomodoro.segundosRestantes;
      progreso = snapshot.pomodoro.segundosFase ? segundos / snapshot.pomodoro.segundosFase : 1;
    } else {
      segundos = enCurso.pomodoroMin * 60;
    }
  } else if (proxima) {
    texto = `Tenés una sesión de enfoque lista para arrancar: ${proxima.pomodoroMin} minutos de ${proxima.materiaAsociada.nombre} con "${proxima.nombre}", el ${formatearDiaHora(proxima.fechaProgramada).toLowerCase()}.`;
    boton = { etiqueta: 'Ir a la sesión →', ruta: `/sesiones/${proxima.idSesion}` };
    segundos = proxima.pomodoroMin * 60;
  } else {
    texto = 'No tenés sesiones programadas. Creá una y organizá tu próximo bloque de estudio.';
    boton = { etiqueta: 'Crear sesión →', ruta: '/sesiones/nueva' };
  }

  return (
    <section className="bienvenida">
      <div className="bienvenida__texto">
        <span className="bienvenida__fecha">{formatearFechaLarga()}</span>
        <h2 className="bienvenida__saludo">
          {saludo} <span aria-hidden="true">👋</span>
        </h2>
        <p className="bienvenida__descripcion">{texto}</p>
        <button type="button" className="bienvenida__boton" onClick={() => navigate(boton.ruta)}>
          {boton.etiqueta}
        </button>
      </div>
      <AnilloProgreso progreso={progreso} tamaño={112} grosor={11} claseRelleno="bienvenida__anillo-relleno" clasePista="bienvenida__anillo-pista">
        <span className="bienvenida__reloj">{segundos !== null ? formatearTiempo(segundos) : '--:--'}</span>
      </AnilloProgreso>
    </section>
  );
}
