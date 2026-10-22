import { useEffect, useState } from 'react';
import type { Archivo } from '../../types/nodo';
import type { AplicacionExterna } from '../../types/archivo';
import { OPCIONES_ABRIR_CON, AVISO_GOOGLE, abrirCon, type DestinoExterno } from './abrirCon';
import '../../styles/abrirCon.css';

interface ModalAbrirConProps {
  archivo: Archivo;
  onCerrar: () => void;
  onError: (mensaje: string) => void;
}

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo abrir el archivo.');

// Cartel "Abrir con": Microsoft / Google arriba y, abajo, las apps del sistema.
export function ModalAbrirCon({ archivo, onCerrar, onError }: ModalAbrirConProps) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [aplicaciones, setAplicaciones] = useState<AplicacionExterna[] | null>(null);

  useEffect(() => {
    window.api.aplicacionesDisponibles({ id: archivo.id })
      .then(setAplicaciones)
      .catch(() => setAplicaciones([]));
  }, [archivo.id]);

  const ejecutar = (accion: Promise<void>) =>
    accion.then(onCerrar).catch((e) => {
      onError(mensajeDe(e));
      onCerrar();
    });

  const elegir = (destino: DestinoExterno) =>
    destino === 'google' ? setAviso(AVISO_GOOGLE) : ejecutar(abrirCon(archivo.id, destino));

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="abrir-con-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="abrir-con-modal__titulo">Abrir con</h3>
        <p className="abrir-con-modal__archivo">{archivo.nombre}.{archivo.extension}</p>

        {aviso ? (
          <p className="abrir-con-modal__aviso">{aviso}</p>
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

            <p className="abrir-con__subtitulo">Otras aplicaciones</p>
            <div className="abrir-con__lista">
              {aplicaciones === null && <p className="abrir-con__vacio">Buscando aplicaciones…</p>}
              {aplicaciones?.length === 0 && <p className="abrir-con__vacio">No se encontraron otras aplicaciones.</p>}
              {aplicaciones?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="abrir-con__app"
                  onClick={() => ejecutar(window.api.abrirConAplicacion({ id: archivo.id, aplicacionId: a.id }))}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="abrir-con__otra"
              onClick={() => ejecutar(window.api.elegirAplicacion({ id: archivo.id }))}
            >
              Elegir otra aplicación…
            </button>
          </>
        )}

        <div className="abrir-con-modal__acciones">
          <button type="button" className="abrir-con-modal__cerrar" onClick={onCerrar}>
            {aviso ? 'Listo' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}