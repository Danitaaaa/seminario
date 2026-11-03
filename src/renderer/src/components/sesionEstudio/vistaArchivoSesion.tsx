import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Archivo } from '../../types/nodo';
import { tipoVisor } from '../visor/formatos';
import { VisorPdf } from '../visor/visorPdf';
import { VisorExcel } from '../visor/visorExcel';
import { ModalAbrirCon } from '../visor/modalAbrirCon';
import { usarAvisos } from '../../hooks/usarAvisos';
import { extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';
import '../../styles/visor.css';

// Ancho con el que Material muestra los PDF y espacio que se deja a los costados de la página.
const ANCHO_MAXIMO_PDF = 760;
const MARGEN_PDF = 48;

interface VistaArchivoSesionProps {
  archivo: Archivo;
}

// Contenido de una pestaña de archivo PDF o Excel: lo muestra dentro del editor de la sesión,
// en el lugar de la hoja, con los mismos visores que usa Material.
// (Los Word y los textos se abren en EditorArchivoSesion, con la misma barra que la sesión.)
// Los cambios se guardan en el archivo de Material, no en la sesión.
// Los formatos que la app no sabe mostrar ofrecen abrirlos con otra aplicación.
export function VistaArchivoSesion({ archivo }: VistaArchivoSesionProps) {
  const avisos = usarAvisos();
  const [contenido, setContenido] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abrirCon, setAbrirCon] = useState(false);
  const tipo = tipoVisor(archivo.extension);

  // El PDF se dibuja con un ancho fijo: se mide la columna para que la página entre entera
  // y no quede tapada por el panel de la derecha (Pomodoro, Spotify, Metas).
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoPdf, setAnchoPdf] = useState(ANCHO_MAXIMO_PDF);
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    const medir = () => {
      const disponible = elemento.clientWidth - MARGEN_PDF;
      setAnchoPdf(Math.max(280, Math.min(ANCHO_MAXIMO_PDF, Math.floor(disponible))));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!tipo) return;
    let activo = true;
    setContenido(null);
    setError(null);
    window.api
      .leerArchivo({ id: archivo.id })
      .then((r) => activo && setContenido(r.contenido))
      .catch((e) => activo && setError(extraerMensajeError(e, 'No se pudo abrir el archivo. Puede que lo hayan borrado de Material.')));
    return () => {
      activo = false;
    };
  }, [archivo.id, tipo]);

  const guardarBytes = async (bytes: Uint8Array) => {
    try {
      await window.api.guardarArchivo({ id: archivo.id, contenido: bytes });
      avisos.exito(`Se guardaron los cambios en "${archivo.nombre}".`);
    } catch (e) {
      avisos.error(extraerMensajeError(e, 'No se pudo guardar el archivo.'));
    }
  };

  return (
    <div className="vista-archivo" ref={contenedor}>
      {!tipo && (
        <div className="vista-archivo__aviso">
          <p>Este formato no se puede mostrar dentro de la app.</p>
          <button type="button" className="boton-chico" onClick={() => setAbrirCon(true)}>
            <ExternalLink size={14} aria-hidden="true" /> Abrir con…
          </button>
        </div>
      )}

      {tipo && error && <div className="vista-archivo__aviso vista-archivo__aviso--error">{error}</div>}
      {tipo && !error && !contenido && <div className="vista-archivo__aviso">Cargando archivo…</div>}

      {contenido && tipo === 'pdf' && <VisorPdf contenido={contenido} onGuardar={guardarBytes} ancho={anchoPdf} />}
      {contenido && tipo === 'xlsx' && <VisorExcel contenido={contenido} onGuardar={guardarBytes} />}

      {abrirCon && (
        <ModalAbrirCon archivo={archivo} onCerrar={() => setAbrirCon(false)} onError={(m) => avisos.error(m)} />
      )}
    </div>
  );
}
