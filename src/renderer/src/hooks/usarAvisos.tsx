import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CartelAviso, type TipoAviso } from '../components/comunes/cartelAviso';
import '../styles/avisos.css';

interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

interface AvisosContexto {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
}

const DURACION_MS: Record<TipoAviso, number> = { exito: 3500, info: 3500, error: 6000 };
const MAXIMO_VISIBLES = 3;

const Contexto = createContext<AvisosContexto | null>(null);

// Carteles de confirmación de toda la app ("Se creó correctamente la sesión", "Se guardaron los cambios"...).
// Van en una esquina, se apilan y se cierran solos. Viven arriba de las rutas, así un cartel
// sigue visible aunque se cambie de pantalla (por ejemplo, al crear una sesión y entrar a ella).
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: TipoAviso, mensaje: string) => {
      const id = siguienteId.current++;
      setAvisos((actuales) => [...actuales.slice(-(MAXIMO_VISIBLES - 1)), { id, tipo, mensaje }]);
      window.setTimeout(() => cerrar(id), DURACION_MS[tipo]);
    },
    [cerrar]
  );

  const valor = useMemo<AvisosContexto>(
    () => ({
      exito: (m) => mostrar('exito', m),
      error: (m) => mostrar('error', m),
      info: (m) => mostrar('info', m),
    }),
    [mostrar]
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="avisos" role="region" aria-label="Notificaciones" aria-live="polite">
        {avisos.map((a) => (
          <CartelAviso key={a.id} tipo={a.tipo} mensaje={a.mensaje} onCerrar={() => cerrar(a.id)} />
        ))}
      </div>
    </Contexto.Provider>
  );
}

const SIN_PROVEEDOR: AvisosContexto = { exito: () => undefined, error: () => undefined, info: () => undefined };

// Devuelve las funciones para mostrar carteles (el objeto es estable entre renders).
// Fuera del proveedor no hace nada, así no rompe pantallas sueltas.
export function usarAvisos(): AvisosContexto {
  return useContext(Contexto) ?? SIN_PROVEEDOR;
}
