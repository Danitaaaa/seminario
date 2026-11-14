import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { esSeccionSinVoz, hablar } from './narrador';
import { darBienvenida, reiniciarBienvenida } from './bienvenida';

const PANTALLAS: Record<string, string> = {
  '/': 'Inicio de sesión',
  '/registro': 'Registro',
  '/material': 'Material de estudio',
  '/eventos': 'Calendario',
  '/horarios': 'Horarios',
  '/cronograma': 'Cronograma',
  '/perfil': 'Perfil',
  '/ajustes': 'Ajustes',
  '/metodos': 'Métodos de estudio',
  '/repeticion-espaciada': 'Repetición espaciada',
  '/flashcards': 'Flashcards',
  '/sesiones': 'Sesiones de estudio',
  '/sesiones/nueva': 'Nueva sesión de estudio',
};

// Las rutas con id (/flashcards/3, /sesiones/7) usan el nombre de su sección.
function nombreDePantalla(ruta: string): string | undefined {
  return PANTALLAS[ruta] ?? PANTALLAS['/' + ruta.split('/')[1]];
}

// Cada vez que cambia la pantalla, la anuncia (con la voz de Syntra o con el lector de pantalla).
export function AnunciarPantalla() {
  const { pathname } = useLocation();

  useEffect(() => {
    // El foco pasa al contenido: si no, queda en la barra lateral y con Tab nunca se llega a la pantalla.
    const contenido = document.querySelector<HTMLElement>('main');
    if (contenido) {
      contenido.tabIndex = -1;
      contenido.focus({ preventScroll: true });
    }

    if (pathname === '/') reiniciarBienvenida();
    if (pathname === '/dashboard') {
      darBienvenida();
      return;
    }
    if (esSeccionSinVoz(pathname)) {
      hablar('Esta sección no está disponible con la voz de Syntra. Con Tab llegás al menú para ir a otra.', undefined, true);
      return;
    }
    const nombre = nombreDePantalla(pathname);
    if (nombre) hablar(nombre);
  }, [pathname]);

  return null;
}
