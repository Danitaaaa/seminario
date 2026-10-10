import { useEffect, useState } from 'react';
import type { Archivo } from '../../types/nodo';
import { CartelError } from '../comunes/cartelError';
import { tipoVisor } from './formatos';
import { VisorPdf } from './visorPdf';
import { VisorDocx } from './visorDocx';
import { VisorExcel } from './visorExcel';
import { VisorTexto } from './visorTexto';
import '../../styles/visor.css';

interface VisorArchivoProps {
  archivo: Archivo;
  onCerrar: () => void;
  onGuardado: () => void;
}

const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto);

// Carga el archivo desde el main y elige el visor según la extensión.
export function VisorArchivo({ archivo, onCerrar, onGuardado }: VisorArchivoProps) {
  const [contenido, setContenido] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const tipo = tipoVisor(archivo.extension);

  useEffect(() => {
    window.api
      .leerArchivo({ id: archivo.id })
      .then((r) => setContenido(r.contenido))
      .catch((e) => setError(mensaje(e, 'No se pudo abrir el archivo.')));
  }, [archivo.id]);

  const guardarBytes = async (bytes: Uint8Array) => {
    try {
      await window.api.guardarArchivo({ id: archivo.id, contenido: bytes });
      setAviso('Cambios guardados.');
      onGuardado();
    } catch (e) {
      setError(mensaje(e, 'No se pudo guardar.'));
    }
  };

  const guardarDocx = async (html: string) => {
    try {
      await window.api.guardarDocx({ id: archivo.id, html });
      setAviso('Cambios guardados.');
      onGuardado();
    } catch (e) {
      setError(mensaje(e, 'No se pudo guardar.'));
    }
  };

  const abrirExterno = () =>
    window.api.abrirExterno({ id: archivo.id }).catch((e) => setError(mensaje(e, 'No se pudo abrir.')));

  return (
    <div className="visor-overlay">
      <div className="visor">
        <header className="visor__encabezado">
          <h3 className="visor__titulo">{archivo.nombre}.{archivo.extension}</h3>
          <div className="visor__acciones">
            <button className="visor-boton visor-boton--contorno" onClick={abrirExterno}>Abrir con app externa</button>
            <button className="visor-boton visor-boton--contorno" onClick={onCerrar}>Cerrar</button>
          </div>
        </header>

        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}
        {aviso && (
          <p className="visor__aviso" onClick={() => setAviso(null)}>{aviso}</p>
        )}

        <div className="visor__cuerpo">
          {!contenido && !error && <p className="visor__cargando">Cargando…</p>}
          {contenido && tipo === 'pdf' && <VisorPdf contenido={contenido} onGuardar={guardarBytes} />}
          {contenido && tipo === 'docx' && <VisorDocx contenido={contenido} onGuardar={guardarDocx} />}
          {contenido && tipo === 'xlsx' && <VisorExcel contenido={contenido} onGuardar={guardarBytes} />}
          {contenido && tipo === 'texto' && <VisorTexto contenido={contenido} onGuardar={guardarBytes} />}
        </div>
      </div>
    </div>
  );
}