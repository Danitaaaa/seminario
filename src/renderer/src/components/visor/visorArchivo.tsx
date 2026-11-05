import { useEffect, useState } from 'react';
import type { Archivo } from '../../types/nodo';
import { CartelError } from '../comunes/cartelError';
import { tipoVisor } from './formatos';
import { VisorPdf } from './visorPdf';
import { VisorDocx } from './visorDocx';
import { VisorExcel } from './visorExcel';
import { VisorTexto } from './visorTexto';
import { MenuAbrirCon } from './menuAbrirCon';
import { BannerEdicion } from '../proyectos/bannerEdicion';
import { ModalConflicto } from '../proyectos/modalConflicto';
import { useEdicionDeElemento } from '../../hooks/useEdicionCompartida';
import '../../styles/visor.css';

interface VisorArchivoProps {
  archivo: Archivo;
  onCerrar: () => void;
  onGuardado: () => void;
  soloLectura?: boolean; // true: no se guarda nada aunque el visor permita editar
}

const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto);

// Carga el archivo desde el main y elige el visor según la extensión.
export function VisorArchivo({ archivo, onCerrar, onGuardado, soloLectura = false }: VisorArchivoProps) {
  const [contenido, setContenido] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [resolviendo, setResolviendo] = useState(false);
  const tipo = tipoVisor(archivo.extension);

  // Archivo de un proyecto compartido: mientras está abierto se toma el bloqueo, así nadie más lo
  // edita al mismo tiempo. En el material personal no hay bloqueos.
  const { clave, estado, puedeEditar, guardar: subirEdicion, reintentar } = useEdicionDeElemento('archivo', archivo.id);
  const sinEdicion = soloLectura || !puedeEditar;

  useEffect(() => {
    window.api
      .leerArchivo({ id: archivo.id })
      .then((r) => setContenido(r.contenido))
      .catch((e) => setError(mensaje(e, 'No se pudo abrir el archivo.')));
  }, [archivo.id, recarga]);

  const motivoSinEdicion = () =>
    soloLectura ? 'Tu rol en este proyecto es de solo lectura.' : 'Ahora no se puede editar este archivo: mirá el aviso de arriba.';

  // Después de guardar en esta compu, se sube la versión para el resto del proyecto.
  const alGuardar = async () => {
    setAviso('Cambios guardados.');
    onGuardado();
    if (clave) await subirEdicion();
  };

  const guardarBytes = async (bytes: Uint8Array) => {
    if (sinEdicion) return setError(motivoSinEdicion());
    try {
      await window.api.guardarArchivo({ id: archivo.id, contenido: bytes });
      await alGuardar();
    } catch (e) {
      setError(mensaje(e, 'No se pudo guardar.'));
    }
  };

  const guardarDocx = async (html: string) => {
    if (sinEdicion) return setError(motivoSinEdicion());
    try {
      await window.api.guardarDocx({ id: archivo.id, html });
      await alGuardar();
    } catch (e) {
      setError(mensaje(e, 'No se pudo guardar.'));
    }
  };

  // Resuelto el conflicto: se muestra la versión que quedó y se vuelve a pedir el bloqueo.
  const alResolver = () => {
    setResolviendo(false);
    setContenido(null);
    setRecarga((n) => n + 1);
    onGuardado();
    void reintentar();
  };

  return (
    <div className="visor-overlay">
      <div className="visor">
        <header className="visor__encabezado">
          <h3 className="visor__titulo">{archivo.nombre}.{archivo.extension}</h3>
          <div className="visor__acciones">
            <MenuAbrirCon archivo={archivo} onError={setError} />
            <button className="visor-boton visor-boton--contorno" onClick={onCerrar}>Cerrar</button>
          </div>
        </header>

        {soloLectura && <p className="visor__aviso">Solo lectura: tu rol no permite modificar este archivo.</p>}
        {clave && (
          <BannerEdicion estado={estado} onReintentar={() => void reintentar()} onResolverConflicto={() => setResolviendo(true)} />
        )}
        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}
        {aviso && (
          <p className="visor__aviso" onClick={() => setAviso(null)}>{aviso}</p>
        )}

        <div className="visor__cuerpo">
          {!contenido && !error && <p className="visor__cargando">Cargando…</p>}
          {contenido && tipo === 'pdf' && <VisorPdf contenido={contenido} onGuardar={guardarBytes} soloLectura={sinEdicion} />}
          {contenido && tipo === 'docx' && <VisorDocx contenido={contenido} onGuardar={guardarDocx} soloLectura={sinEdicion} />}
          {contenido && tipo === 'xlsx' && <VisorExcel contenido={contenido} onGuardar={guardarBytes} soloLectura={sinEdicion} />}
          {contenido && tipo === 'texto' && <VisorTexto contenido={contenido} onGuardar={guardarBytes} soloLectura={sinEdicion} />}
        </div>
      </div>

      {resolviendo && clave && (
        <ModalConflicto clave={clave} onCerrar={() => setResolviendo(false)} onResuelto={alResolver} />
      )}
    </div>
  );
}