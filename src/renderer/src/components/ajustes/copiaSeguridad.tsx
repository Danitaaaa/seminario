import { useEffect, useState } from 'react';
import { Download, HardDriveUpload, History, ShieldCheck } from 'lucide-react';
import type { EstadoCopiaSeguridad } from '../../types/copiaSeguridad';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';
import { ModalRestaurar } from '../copiaSeguridad/modalRestaurar';

const cuando = (iso: string) => {
  const f = new Date(iso);
  const hoy = new Date().toDateString() === f.toDateString();
  return `${hoy ? 'hoy' : f.toLocaleDateString('es-AR')} a las ${f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
};
const megas = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;

// Ajustes > Copia de seguridad: copia cifrada de todo Syntra en Google Drive o en un archivo, y restaurar.
export function AjustesCopiaSeguridad() {
  const [estado, setEstado] = useState<EstadoCopiaSeguridad | null>(null);
  const [trabajando, setTrabajando] = useState<'drive' | 'archivo' | 'configurar' | null>(null);
  const [password, setPassword] = useState('');
  const [restaurando, setRestaurando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.estadoCopiaSeguridad().then(setEstado).catch(() => setEstado(null));
  }, []);

  async function hacer(accion: 'drive' | 'archivo' | 'configurar', llamada: () => Promise<EstadoCopiaSeguridad | null>) {
    setTrabajando(accion);
    setError('');
    try {
      const nuevo = await llamada();
      if (nuevo) {
        setEstado(nuevo);
        setPassword('');
      }
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo hacer la copia.'));
    } finally {
      setTrabajando(null);
    }
  }

  if (!estado) return null;
  // Sin clave guardada (entró con la cara, o Linux sin llavero), hay que escribir la contraseña.
  const pidePassword = !estado.claveGuardada;
  const datos = { password: pidePassword ? password : undefined };

  return (
    <section className="ajustes__seccion">
      <h3 className="ajustes__titulo">Copia de seguridad</h3>
      <p className="ajustes__ayuda">
        Guarda todo Syntra (materias, cuadernos, notas, horarios, sesiones y material) en tu Google Drive o en un
        archivo, cifrado con tu contraseña. Si la olvidás, la copia no se puede abrir.
      </p>

      <p className="ajustes__calendario-estado">
        <ShieldCheck size={16} aria-hidden="true" />
        {estado.ultima
          ? `Última copia: ${cuando(estado.ultima.fecha)} · ${estado.ultima.lugar === 'drive' ? 'en tu Google Drive' : 'en un archivo'} · ${megas(estado.ultima.tamanio)}`
          : 'Todavía no hiciste ninguna copia.'}
      </p>

      {estado.variosUsuarios ? (
        <p className="ajustes__error">
          En esta compu hay más de un usuario de Syntra: la copia de seguridad solo se puede hacer cuando hay uno.
        </p>
      ) : (
        <>
          {pidePassword && (
            <label className="ajustes__campo-copia">
              Tu contraseña (para cifrar la copia)
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          )}
          <div className="ajustes__calendario-acciones">
            <button
              type="button"
              className="ajustes__boton"
              disabled={trabajando !== null || (pidePassword && !password)}
              onClick={() => void hacer('drive', () => window.api.copiarADrive(datos))}
            >
              <HardDriveUpload size={14} aria-hidden="true" />
              {trabajando === 'drive' ? 'Copiando…' : 'Copiar a Drive ahora'}
            </button>
            <button
              type="button"
              className="ajustes__boton ajustes__boton--secundario"
              disabled={trabajando !== null || (pidePassword && !password)}
              onClick={() => void hacer('archivo', () => window.api.guardarCopiaEnArchivo(datos))}
            >
              <Download size={14} aria-hidden="true" />
              {trabajando === 'archivo' ? 'Guardando…' : 'Guardar en un archivo'}
            </button>
          </div>

          <label className="ajustes__calendario-opcion">
            <input
              type="checkbox"
              checked={estado.automatica}
              disabled={trabajando !== null}
              onChange={(e) => void hacer('configurar', () => window.api.configurarCopiaSeguridad({ automatica: e.target.checked }))}
            />
            <span>
              Copia automática en Drive una vez por semana
              <small>
                {estado.claveGuardada
                  ? 'Se hace sola mientras Syntra está abierta. En Drive quedan las últimas tres.'
                  : estado.puedeGuardarClave
                    ? 'Para que se haga sola, iniciá sesión una vez con tu contraseña.'
                    : 'En esta compu no se puede guardar la clave de forma segura: la copia se hace a mano, con tu contraseña.'}
              </small>
            </span>
          </label>
        </>
      )}

      <h4 className="ajustes__subtitulo">Restaurar una copia</h4>
      <p className="ajustes__ayuda">Reemplaza todo lo de esta compu por lo de la copia. Antes se guarda lo que hay, por las dudas.</p>
      <div className="ajustes__calendario-acciones">
        <button type="button" className="ajustes__boton ajustes__boton--secundario" onClick={() => setRestaurando(true)}>
          <History size={14} aria-hidden="true" /> Elegir copia…
        </button>
      </div>

      {error && <p className="ajustes__error">{error}</p>}
      {restaurando && <ModalRestaurar desdeInicio={false} onCerrar={() => setRestaurando(false)} />}
    </section>
  );
}
