import { useEffect, useState } from 'react';
import type { Archivo } from '../../types/nodo';
import type { AplicacionExterna } from '../../types/archivo';
import { OPCIONES_ABRIR_CON, abrirCon, type DestinoExterno } from './abrirCon';
import '../../styles/abrirCon.css';

interface ModalAbrirConProps {
  archivo: Archivo;
  onCerrar: () => void;
  onError: (mensaje: string) => void;
}

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (e: unknown) =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    : 'No se pudo abrir el archivo.';

// Cartel "Abrir con": Microsoft / Google arriba, traer la versión de Drive y, abajo, las apps del sistema.
export function ModalAbrirCon({ archivo, onCerrar, onError }: ModalAbrirConProps) {
  const [aplicaciones, setAplicaciones] = useState<AplicacionExterna[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmandoTraer, setConfirmandoTraer] = useState(false);

  useEffect(() => {
    window.api.aplicacionesDisponibles({ id: archivo.id })
      .then(setAplicaciones)
      .catch(() => setAplicaciones([]));
  }, [archivo.id]);

  const ejecutar = (accion: () => Promise<void>, mensaje: string | null = null) => {
    setOcupado(mensaje);
    accion()
      .then(onCerrar)
      .catch((e) => {
        onError(mensajeDe(e));
        onCerrar();
      });
  };

  const elegir = (destino: DestinoExterno) =>
    ejecutar(() => abrirCon(archivo.id, destino), destino === 'google' ? 'Subiendo a Google Docs…' : null);

  const traerVersion = () =>
    ejecutar(() => window.api.traerVersionDrive({ id: archivo.id }), 'Trayendo la versión de Drive…');

  return (
    <div className="modal-overlay" onClick={ocupado ? undefined : onCerrar}>
      <div className="abrir-con-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="abrir-con-modal__titulo">Abrir con</h3>
        <p className="abrir-con-modal__archivo">{archivo.nombre}.{archivo.extension}</p>

        {ocupado ? (
          <p className="abrir-con-modal__aviso">{ocupado}</p>
        ) : confirmandoTraer ? (
          <>
            <p className="abrir-con-modal__aviso">
              Se reemplaza el archivo de Syntra por la versión editada en Google. Los cambios que hiciste acá se pierden.
            </p>
            <div className="abrir-con-modal__acciones">
              <button type="button" className="abrir-con-modal__confirmar" onClick={traerVersion}>
                Sí, reemplazar
              </button>
              <button type="button" className="abrir-con-modal__cerrar" onClick={() => setConfirmandoTraer(false)}>
                Volver
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="abrir-con__opciones">
              {OPCIONES_ABRIR_CON.map((o) => (
                <button key={o.destino} type="button" className="abrir-con__opcion" onClick={() => elegir(o.destino)}>
                  <strong>{o.etiqueta}</strong>
                  <span>{o.detalle}</span>
                </button>
              ))}
            </div>
            <button type="button" className="abrir-con__otra" onClick={() => setConfirmandoTraer(true)}>
              Traer versión de Google Drive…
            </button>

            <p className="abrir-con__subtitulo">Otras aplicaciones</p>
            <div className="abrir-con__lista">
              {aplicaciones === null && <p className="abrir-con__vacio">Buscando aplicaciones…</p>}
              {aplicaciones?.length === 0 && <p className="abrir-con__vacio">No se encontraron otras aplicaciones.</p>}
              {aplicaciones?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="abrir-con__app"
                  onClick={() => ejecutar(() => window.api.abrirConAplicacion({ id: archivo.id, aplicacionId: a.id }))}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="abrir-con__otra"
              onClick={() => ejecutar(() => window.api.elegirAplicacion({ id: archivo.id }))}
            >
              Elegir otra aplicación…
            </button>

            <div className="abrir-con-modal__acciones">
              <button type="button" className="abrir-con-modal__cerrar" onClick={onCerrar}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}