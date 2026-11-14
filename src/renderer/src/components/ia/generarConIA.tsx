import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartelError } from '../comunes/cartelError';
import { PantallaPrevia } from './pantallaPrevia';
import { IndicadorIA } from '../materialIA/indicadorIA';
import {
  NOMBRE_TIPO_IA,
  RUTA_TIPO_IA,
  type MaterialIA,
  type ProgresoIA,
  type PropuestaIA,
  type TipoMaterialIA,
} from '../../types/ia';
import { mensajeError } from '../../pages/metodos/utilidadesMetodosIA';
import '../../styles/ia.css';

interface GenerarConIAProps {
  archivo: { id: number; nombre: string; extension: string | null };
  onCerrar: () => void;
  // Desde Métodos (por ejemplo, Resúmenes) ya se sabe qué generar: no se muestra la elección.
  tipoFijo?: TipoMaterialIA;
}

type Paso = 'elegir' | 'generando' | 'revisar' | 'listo';

// Los resúmenes ya no pasan por acá: se generan como documento editable (ModalResumenIA), igual que las guías.
const TIPOS: TipoMaterialIA[] = ['cuestionario', 'mapaMental'];

const EJEMPLOS: Record<TipoMaterialIA, string> = {
  resumen: 'Ej.: nivel parcial, enfocado en las definiciones, más corto…',
  cuestionario: 'Ej.: 10 preguntas, dificultad alta, solo de la unidad 2…',
  mapaMental: 'Ej.: centrado en los procesos, pocos niveles…',
};

// Elegir qué generar (+ indicaciones opcionales) → progreso con Cancelar → pantalla previa → guardado.
export function GenerarConIA({ archivo, onCerrar, tipoFijo }: GenerarConIAProps) {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('elegir');
  const [tipo, setTipo] = useState<TipoMaterialIA>(tipoFijo ?? 'cuestionario');
  const [guardado, setGuardado] = useState<MaterialIA | null>(null);
  const [preferencias, setPreferencias] = useState('');
  const [progreso, setProgreso] = useState<ProgresoIA | null>(null);
  const [propuesta, setPropuesta] = useState<PropuestaIA | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trabajoId = useRef<string | null>(null);

  // Progreso de la cola de IA (es una sola para toda la app: se filtra por id).
  useEffect(() => window.api.onProgreso((p) => {
    if (p.id === trabajoId.current) setProgreso(p);
  }), []);

  // Si se cierra el modal a mitad de camino, se cancela el pedido.
  useEffect(() => () => {
    if (trabajoId.current) void window.api.cancelar(trabajoId.current).catch(() => {});
  }, []);

  const generar = async () => {
    const id = crypto.randomUUID();
    trabajoId.current = id;
    setError(null);
    setProgreso(null);
    setPaso('generando');
    try {
      const r = await window.api.generarMaterialIA({
        trabajoId: id,
        idArchivo: archivo.id,
        tipo,
        preferencias: preferencias.trim() || undefined,
      });
      if (r.ok && r.propuesta.idMaterialIA) {
        // Cuestionario: ya está guardado y se abre para resolver (no tiene pantalla previa).
        navigate(`${RUTA_TIPO_IA.cuestionario}/${r.propuesta.idMaterialIA}/resolver`);
        onCerrar();
      } else if (r.ok) {
        setPropuesta(r.propuesta);
        setPaso('revisar');
      } else {
        setPaso('elegir'); // canceló
      }
    } catch (e) {
      setError(mensajeError(e, 'No se pudo generar.'));
      setPaso('elegir');
    } finally {
      trabajoId.current = null;
    }
  };

  const cancelar = () => {
    if (trabajoId.current) void window.api.cancelar(trabajoId.current);
  };

  // "hechas" son las partes ya terminadas; los archivos largos se mandan a la IA en varias partes.
  const hechas = progreso?.hechas ?? 0;
  const total = progreso?.total ?? 0;
  const detalleProgreso =
    progreso?.estado === 'en_cola'
      ? 'Esperando turno: hay otra generación en curso.'
      : total > 1
        ? `Parte ${Math.min(hechas + 1, total)} de ${total} · puede tardar un poco`
        : 'Puede tardar un poco según el tamaño del material.';

  return (
    <div className="visor-overlay">
      <div className={`ia-modal ${paso === 'revisar' ? 'ia-modal--grande' : ''}`} role="dialog" aria-label="Generar con IA">
        <header className="visor__encabezado">
          <h3 className="visor__titulo">Generar con IA · {archivo.nombre}.{archivo.extension}</h3>
          {/* Solo al elegir: mientras genera se usa "Cancelar" y al terminar, el "Cerrar" de abajo. */}
          {paso === 'elegir' && (
            <button type="button" className="visor-boton visor-boton--contorno" onClick={onCerrar}>Cerrar</button>
          )}
        </header>

        {error && <CartelError mensaje={error} titulo="No se pudo generar" onCerrar={() => setError(null)} onReintentar={generar} />}

        {paso === 'elegir' && (
          <div className="ia-elegir">
            {tipoFijo ? (
              <p className="ia-elegir__texto">Se va a generar un {NOMBRE_TIPO_IA[tipoFijo].toLowerCase()} con este archivo.</p>
            ) : (
              <p className="ia-elegir__texto">¿Qué querés que arme la IA con este archivo?</p>
            )}
            {!tipoFijo && <div className="ia-elegir__opciones" role="radiogroup" aria-label="Tipo de material">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t}
                  className={`ia-elegir__opcion ${tipo === t ? 'ia-elegir__opcion--activa' : ''}`}
                  onClick={() => setTipo(t)}
                >
                  {NOMBRE_TIPO_IA[t]}
                </button>
              ))}
            </div>}
            {tipo === 'cuestionario' && (
              <p className="ia-elegir__nota">
                Mezcla preguntas de opción múltiple, para completar eligiendo y para completar escribiendo.
                Se abre para resolver apenas esté listo; las respuestas se ven al final.
              </p>
            )}
            <label className="ia-elegir__indicaciones">
              Indicaciones para la IA (opcional)
              <textarea
                rows={3}
                maxLength={2000}
                value={preferencias}
                placeholder={EJEMPLOS[tipo]}
                onChange={(e) => setPreferencias(e.target.value)}
              />
            </label>
            <button type="button" className="visor-boton" onClick={generar}>Generar</button>
          </div>
        )}

        {paso === 'generando' && (
          // La misma animación que los modales de flashcards y guía de preguntas (siempre en movimiento).
          <div className="ia-progreso">
            <IndicadorIA mensaje={`Generando el ${NOMBRE_TIPO_IA[tipo].toLowerCase()}`} detalle={detalleProgreso} />
            <button type="button" className="visor-boton visor-boton--contorno" onClick={cancelar}>Cancelar generación</button>
          </div>
        )}

        {paso === 'revisar' && propuesta && (
          <PantallaPrevia
            propuesta={propuesta}
            onGuardado={(material) => {
              setGuardado(material);
              setPaso('listo');
            }}
            onDescartado={onCerrar}
          />
        )}

        {paso === 'listo' && (
          <div className="ia-elegir">
            <p className="ia-elegir__texto">
              Listo, se guardó el {NOMBRE_TIPO_IA[propuesta!.tipo].toLowerCase()}. Lo vas a encontrar en Métodos.
            </p>
            <div className="ia-elegir__acciones">
              {guardado && (
                <button
                  type="button"
                  className="visor-boton"
                  onClick={() => navigate(`${RUTA_TIPO_IA[guardado.tipo]}/${guardado.idMaterialIA}`)}
                >
                  Ver en Métodos
                </button>
              )}
              <button type="button" className="visor-boton visor-boton--contorno" onClick={onCerrar}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
