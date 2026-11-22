import { useEffect, useRef, useState } from 'react';
import type { Archivo } from '../../types/nodo';
import { CartelError } from '../comunes/cartelError';
import { tipoVisor } from './formatos';
import { VisorPdf } from './visorPdf';
import { VisorDocx } from './visorDocx';
import { VisorExcel } from './visorExcel';
import { VisorTexto } from './visorTexto';
import { MenuAbrirCon } from './menuAbrirCon';
import { ModalConflictoDrive } from './modalConflictoDrive';
import type { LadoDrive } from '../../types/archivo';
import { BannerEdicion } from '../proyectos/bannerEdicion';
import { ModalConflicto } from '../proyectos/modalConflicto';
import { useEdicionDeElemento } from '../../hooks/useEdicionCompartida';
import { useVoice } from '../../hooks/useVoice';
import { usarAvisos } from '../../hooks/usarAvisos';
import { descargarArchivos } from '../../utils/descargar';
import '../../styles/visor.css';
import { extraerBloques } from '../../voz/extraerTexto';
import { anteriorTitulo, detenerLectura, empezarLectura, pausarLectura, seguirLectura, siguienteTitulo } from '../../voz/lectorDocumento';

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
  const [lectura, setLectura] = useState<'quieta' |'leyendo' | 'pausada'>('quieta');
  const [aviso, setAviso] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [resolviendo, setResolviendo] = useState(false);
  const [completo, setCompleto] = useState(false);
  const [conflictoDrive, setConflictoDrive] = useState(false);
  const avisos = usarAvisos();

  // Agrandar: el visor ocupa toda la ventana de Syntra. Escape (o el botón) lo achica.
  const alternarCompleto = () => setCompleto((c) => !c);
  useEffect(() => {
    if (!completo) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompleto(false);
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [completo]);
  const tipo = tipoVisor(archivo.extension);

  // Archivo de un proyecto compartido: mientras está abierto se toma el bloqueo, así nadie más lo
  // edita al mismo tiempo. En el material personal no hay bloqueos.
  const { clave, estado, puedeEditar, guardar: subirEdicion, reintentar } = useEdicionDeElemento('archivo', archivo.id);
  const sinEdicion = soloLectura || !puedeEditar;

  useEffect(() => {
    let vigente = true;
    window.api
      .leerArchivo({ id: archivo.id })
      .then((r) => vigente && setContenido(r.contenido))
      .catch((e) => vigente && setError(mensaje(e, 'No se pudo abrir el archivo.')));
    return () => {
      vigente = false;
    };
  }, [archivo.id, recarga]);

  // El archivo se reemplazó (por ejemplo, con la versión de Google Docs): se vuelve a leer.
  const recargar = () => {
    setContenido(null);
    setRecarga((n) => n + 1);
    onGuardado();
  };

  // Si el archivo está en Google Docs y se editó allá, se traen esos cambios.
  // No pide iniciar sesión: sin permiso o sin internet, se muestra lo que hay en Syntra.
  useEffect(() => {
    let vigente = true;
    window.api
      .revisarDrive({ id: archivo.id })
      .then((r) => {
        if (!vigente) return;
        if (r === 'traido') {
          setAviso('Se trajeron los cambios de Google Docs.');
          recargar();
        } else if (r === 'conflicto') {
          setConflictoDrive(true);
        }
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo.id]);

  const conservarDrive = (lado: LadoDrive) => {
    setConflictoDrive(false);
    window.api
      .revisarDrive({ id: archivo.id, conservar: lado })
      .then((r) => {
        if (r === 'traido') {
          setAviso('Quedó la versión de Google Docs.');
          recargar();
        } else {
          setAviso('Quedó la versión de Syntra y se subió a Google Docs.');
        }
      })
      .catch((e) => setError(mensaje(e, 'No se pudo sincronizar con Google Docs.')));
  };

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
      // Sin pasar por "Cargando…": el editor sigue abierto y "Ver documento" muestra lo guardado.
      const { contenido: guardado } = await window.api.leerArchivo({ id: archivo.id });
      setContenido(guardado);
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

  useEffect(() => () => detenerLectura(), []); // al cerrar el visor, se calla

  // Cuando el archivo termina de cargar, el foco va a "Leer en voz alta":
  // si no, queda atrás del visor y con Tab nunca se llega a sus botones.
  const botonLeer = useRef<HTMLButtonElement>(null);
  const leerEnVozAlta = useVoice().modoVoz === true;
  useEffect(() => {
    if (contenido) botonLeer.current?.focus();
  }, [contenido]);

  // Mientras lee, ← y → cambian de página sin cortar la lectura.
  useEffect(() => {
    if (lectura !== 'leyendo') return;
    const alTeclear = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable) return;
      if (e.key === 'ArrowRight') siguienteTitulo();
      else if (e.key === 'ArrowLeft') anteriorTitulo();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [lectura]);

  const alternarLectura = async () => {
    if (lectura === 'leyendo') {
      pausarLectura();
      setLectura('pausada');
    } else if (lectura === 'pausada') {
      seguirLectura();
      setLectura('leyendo');
    } else if (contenido) {
      setLectura('leyendo');
      empezarLectura(await extraerBloques(contenido, archivo.extension ?? ''));
    }
  };

  return (
    <div className="visor-overlay">
      <div className={`visor${completo ? ' visor--completo' : ''}`}>
        <header className="visor__encabezado">
          <h3 className="visor__titulo">{archivo.nombre}.{archivo.extension}</h3>
          <div className="visor__acciones">
            {/* Leer en voz alta es para quien usa Syntra con la voz (modo voz activado). */}
            {leerEnVozAlta && (
              <button ref={botonLeer} className="visor-boton visor-boton--contorno" onClick={alternarLectura} disabled={!contenido}>
                {lectura === 'leyendo' ? 'Pausar lectura' : lectura === 'pausada' ? 'Seguir leyendo' : 'Leer en voz alta'}
              </button>
            )}
            <MenuAbrirCon archivo={archivo} onError={setError} onCambioArchivo={recargar} />
            <button className="visor-boton visor-boton--contorno" onClick={() => void descargarArchivos([archivo.id], avisos)}>
              Descargar
            </button>
            <button className="visor-boton visor-boton--contorno" onClick={alternarCompleto}>
              {completo ? 'Achicar' : 'Agrandar'}
            </button>
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

      {conflictoDrive && (
        <ModalConflictoDrive
          nombre={`${archivo.nombre}.${archivo.extension}`}
          onElegir={conservarDrive}
          onCancelar={() => setConflictoDrive(false)}
        />
      )}

      {resolviendo && clave && (
        <ModalConflicto clave={clave} onCerrar={() => setResolviendo(false)} onResuelto={alResolver} />
      )}
    </div>
  );
}