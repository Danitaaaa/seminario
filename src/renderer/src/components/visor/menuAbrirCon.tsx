import { useState } from 'react';
import { OPCIONES_ABRIR_CON, AVISO_GOOGLE, abrirCon } from './abrirCon';

interface MenuAbrirConProps {
  idArchivo: number;
  onAviso: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

// Botón "Abrir con" del visor: despliega las opciones Microsoft / Google.
export function MenuAbrirCon({ idArchivo, onAviso, onError }: MenuAbrirConProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="abrir-con">
      <button className="visor-boton visor-boton--contorno" onClick={() => setAbierto((v) => !v)}>
        Abrir con ▾
      </button>
      {abierto && (
        <div className="abrir-con__menu" role="menu">
          {OPCIONES_ABRIR_CON.map((o) => (
            <button
              key={o.destino}
              className="abrir-con__opcion"
              onClick={() => {
                setAbierto(false);
                abrirCon(idArchivo, o.destino)
                  .then(() => o.destino === 'google' && onAviso(AVISO_GOOGLE))
                  .catch((e) => onError(e instanceof Error ? e.message : 'No se pudo abrir el archivo.'));
              }}
            >
              <strong>{o.etiqueta}</strong>
              <span>{o.detalle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}