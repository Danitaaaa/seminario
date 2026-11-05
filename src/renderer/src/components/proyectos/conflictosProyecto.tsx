import { useCallback, useEffect, useState } from 'react';
import type { EntidadEditable, Resultado } from '../../hooks/useEdicionCompartida';
import { useCambiosRemotos } from '../../hooks/useCambiosRemotos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { ModalConflicto } from './modalConflicto';
import '../../styles/edicion.css';

interface Conflicto { entidad: EntidadEditable; idGlobal: string; nombre: string | null }

interface Props {
  idProyecto: number | null | undefined; // sin proyecto (material personal) no muestra nada
  entidad: EntidadEditable;
  onResuelto?: () => void;
}

const NOMBRE_ENTIDAD: Record<EntidadEditable, string> = {
  archivo: 'archivo', evento: 'evento', meta: 'meta', tarea: 'tarea',
};

// Aviso con los elementos de un proyecto que tienen dos versiones distintas (una editada en esta compu
// sin conexión o sin bloqueo, y otra guardada por otro miembro). Cada uno abre el panel para resolverlo.
export function ConflictosProyecto({ idProyecto, entidad, onResuelto }: Props) {
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [abierto, setAbierto] = useState<Conflicto | null>(null);
  const idUsuario = obtenerUsuarioId();

  const cargar = useCallback(async () => {
    if (idProyecto == null || idUsuario === null) return setConflictos([]);
    const r = (await window.api.listarConflictos({ idProyecto, idUsuario })) as Resultado<Conflicto[]>;
    if (r.ok) setConflictos(r.datos.filter((c) => c.entidad === entidad));
  }, [idProyecto, idUsuario, entidad]);

  useEffect(() => { void cargar(); }, [cargar]);
  useCambiosRemotos(idProyecto, () => void cargar(), { tipos: ['cambios_recibidos', 'conflicto_detectado'] });

  if (idProyecto == null || idUsuario === null || conflictos.length === 0) return null;

  return (
    <>
      <div className="edicion-banner edicion-banner--error conflictos-proyecto" role="status">
        <span>
          {conflictos.length === 1
            ? `Hay un ${NOMBRE_ENTIDAD[entidad]} con dos versiones distintas. Elegí con cuál quedarte:`
            : `Hay ${conflictos.length} elementos con dos versiones distintas. Elegí con cuál quedarte en cada uno:`}
        </span>
        <span className="conflictos-proyecto__lista">
          {conflictos.map((c) => (
            <button key={c.idGlobal} type="button" className="edicion-banner__accion" onClick={() => setAbierto(c)}>
              {c.nombre ?? `Sin nombre`}
            </button>
          ))}
        </span>
      </div>
      {abierto && (
        <ModalConflicto
          clave={{ idProyecto, idUsuario, entidad: abierto.entidad, idGlobal: abierto.idGlobal }}
          onCerrar={() => setAbierto(null)}
          onResuelto={() => { setAbierto(null); void cargar(); onResuelto?.(); }}
        />
      )}
    </>
  );
}
