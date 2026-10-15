import { useState } from 'react';
import type { Archivo } from '../../types/nodo';
import { OPCIONES_ABRIR_CON, AVISO_GOOGLE, abrirCon } from './abrirCon';
import '../../styles/visor.css';

interface ModalAbrirConProps {
  archivo: Archivo;
  onCerrar: () => void;
  onError: (mensaje: string) => void;
}

// Para los formatos que la app no muestra: elegir si abrirlo con Microsoft o con Google.
export function ModalAbrirCon({ archivo, onCerrar, onError }: ModalAbrirConProps) {
  const [aviso, setAviso] = useState<string | null>(null);

  const elegir = (destino: 'microsoft' | 'google') =>
    abrirCon(archivo.id, destino)
      .then(() => (destino === 'google' ? setAviso(AVISO_GOOGLE) : onCerrar()))
      .catch((e) => {
        onError(e instanceof Error ? e.message : 'No se pudo abrir el archivo.');
        onCerrar();
      });

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__titulo">Abrir con</h3>
        <p className="modal__texto">{archivo.nombre}.{archivo.extension}</p>

        {aviso ? (
          <p className="visor__aviso">{aviso}</p>
        ) : (
          OPCIONES_ABRIR_CON.map((o) => (
            <button key={o.destino} className="abrir-con__opcion abrir-con__opcion--borde" onClick={() => elegir(o.destino)}>
              <strong>{o.etiqueta}</strong>
              <span>{o.detalle}</span>
            </button>
          ))
        )}

        <div className="modal__acciones">
          <button className="visor-boton visor-boton--contorno" onClick={onCerrar}>
            {aviso ? 'Listo' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}