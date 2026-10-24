import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { BannerBienvenida } from '../../components/sesionEstudio/bannerBienvenida';
import { BarraFiltrosSesiones } from '../../components/sesionEstudio/barraFiltrosSesiones';
import { ListadoSesiones } from '../../components/sesionEstudio/listadoSesiones';
import { ModalConfiguracionSesion } from '../../components/sesionEstudio/modalConfiguracionSesion';
import { ModalEliminarSesion } from '../../components/sesionEstudio/modalEliminarSesion';
import { ModalRegistrarMateria } from '../../components/sesionEstudio/modalRegistrarMateria';
import { usarAvisos } from '../../hooks/usarAvisos';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { ResumenSesionesEstudio, SesionEstudio } from '../../types/sesionesEstudio';
import type { Direccion, VistaListado } from '../../types/vistaNodos';
import { extraerMensajeError, ordenarSesiones, type OrdenSesiones } from './utilidades';
import { useSesionEnCurso } from './useSesionEnCurso';
import '../../styles/nodos.css';
import '../../styles/sesionesEstudio.css';

// Pestaña "Sesiones de estudio": cartel de bienvenida, "Registrar materia +" y la lista de sesiones
// con el mismo estilo que Material (ordenar, eliminar seleccionadas, cuadrícula o lista).
export function SesionesEstudioPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [resumen, setResumen] = useState<ResumenSesionesEstudio>({ nombreUsuario: '', proximaSesion: null });
  const [vista, setVista] = usarPreferencia<VistaListado>('sesiones-vista', 'lista');
  const [orden, setOrden] = useState<OrdenSesiones>('fecha_programada');
  const [direccion, setDireccion] = useState<Direccion>('ASC');
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const ultimaSeleccionada = useRef<number | null>(null);
  const [enConfiguracion, setEnConfiguracion] = useState<SesionEstudio | null>(null);
  const [porEliminar, setPorEliminar] = useState<SesionEstudio[] | null>(null);
  const [registrandoMateria, setRegistrandoMateria] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sesion: sesionEnCurso, snapshot } = useSesionEnCurso(usuarioId);

  // Vuelve a pedir la lista y el resumen al main.
  const cargar = useCallback(async () => {
    try {
      const [lista, datos] = await Promise.all([
        window.api.listarSesionesEstudio({ usuarioId }),
        window.api.obtenerResumenSesiones({ usuarioId }),
      ]);
      setSesiones(lista);
      setResumen(datos);
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudieron cargar las sesiones.'));
    }
  }, [usuarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ordenadas = useMemo(() => ordenarSesiones(sesiones, orden, direccion), [sesiones, orden, direccion]);
  const enCurso = sesiones.find((s) => s.estado === 'en_curso') ?? sesionEnCurso;

  function alternarOrden(campo: OrdenSesiones) {
    if (campo === orden) setDireccion((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setOrden(campo);
      setDireccion('ASC');
    }
  }

  // Selección como en Material: clic, Ctrl/Cmd+clic suma y Shift+clic elige un rango.
  function seleccionar(sesion: SesionEstudio, evento: MouseEvent) {
    const id = sesion.idSesion;
    // Se lee antes de actualizar: React ejecuta el updater más tarde, cuando la ref ya cambió.
    const anterior = ultimaSeleccionada.current;
    const conShift = evento.shiftKey;
    const conCtrl = evento.ctrlKey || evento.metaKey;
    setSeleccionadas((previas) => {
      const nuevas = new Set(previas);
      if (conShift && anterior !== null) {
        const ids = ordenadas.map((s) => s.idSesion);
        const desde = ids.indexOf(anterior);
        const hasta = ids.indexOf(id);
        if (desde !== -1 && hasta !== -1) {
          const [inicio, fin] = desde < hasta ? [desde, hasta] : [hasta, desde];
          for (let i = inicio; i <= fin; i++) nuevas.add(ids[i]);
        }
      } else if (conCtrl) {
        if (nuevas.has(id)) nuevas.delete(id);
        else nuevas.add(id);
      } else {
        nuevas.clear();
        nuevas.add(id);
      }
      return nuevas;
    });
    ultimaSeleccionada.current = id;
  }

  // Elimina las sesiones confirmadas. Las que están en curso no se pueden borrar.
  async function eliminar(aEliminar: SesionEstudio[]) {
    setPorEliminar(null);
    const resultados = await Promise.allSettled(aEliminar.map((s) => window.api.eliminarSesionEstudio(usuarioId, s.idSesion)));
    const fallidas = aEliminar.filter((_, i) => resultados[i].status === 'rejected');
    const eliminadas = aEliminar.length - fallidas.length;
    setSeleccionadas(new Set(fallidas.map((s) => s.idSesion)));
    await cargar();

    if (eliminadas === 1 && aEliminar.length === 1) avisos.exito('Se eliminó la sesión correctamente.');
    else if (eliminadas > 0) avisos.exito(`Se eliminaron ${eliminadas} sesiones correctamente.`);
    if (fallidas.length > 0) {
      const motivo = (resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
      avisos.error(
        fallidas.length === 1
          ? extraerMensajeError(motivo, `No se pudo eliminar "${fallidas[0].nombre}".`)
          : `No se pudieron eliminar ${fallidas.length} sesiones (las sesiones en curso no se pueden eliminar).`
      );
    }
  }

  // Guarda los cambios del modal y refresca la lista.
  async function guardarConfiguracion(cambios: { nombre: string; fechaProgramada: string }) {
    if (!enConfiguracion) return;
    await window.api.modificarSesionEstudio({ usuarioId, idSesion: enConfiguracion.idSesion, ...cambios });
    setEnConfiguracion(null);
    avisos.exito('Se guardaron los cambios de la sesión.');
    await cargar();
  }

  const seleccion = ordenadas.filter((s) => seleccionadas.has(s.idSesion));

  return (
    <PlantillaLayout titulo="Sesiones de estudio" idActivo="sesiones" usuario={{ nombre: 'Usuario' }}>
      <div className="sesiones" onClick={(e) => e.target === e.currentTarget && setSeleccionadas(new Set())}>
        <BannerBienvenida
          nombreUsuario={resumen.nombreUsuario}
          proxima={resumen.proximaSesion}
          enCurso={enCurso}
          snapshot={snapshot}
        />

        <div className="sesiones__encabezado-lista">
          <h3 className="sesiones__subtitulo">
            <GraduationCap size={18} aria-hidden="true" /> Sesiones de estudio
          </h3>
          <button type="button" className="sesiones__registrar-materia" onClick={() => setRegistrandoMateria(true)}>
            Registrar materia +
          </button>
        </div>

        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} onReintentar={cargar} />}

        <div className="nodos-modulo">
          <BarraFiltrosSesiones
            ordenActivo={orden}
            direccion={direccion}
            onOrdenar={alternarOrden}
            vista={vista}
            onCambiarVista={setVista}
            haySeleccion={seleccion.length > 0}
            onEliminarSeleccion={() => seleccion.length > 0 && setPorEliminar(seleccion)}
            onCrear={() => navigate('/sesiones/nueva')}
          />

          <ListadoSesiones
            vista={vista}
            sesiones={ordenadas}
            seleccionadas={seleccionadas}
            onSeleccionar={seleccionar}
            onAbrir={(s) => navigate(`/sesiones/${s.idSesion}`)}
            onConfigurar={setEnConfiguracion}
            onEliminar={(s) => setPorEliminar([s])}
            onCrear={() => navigate('/sesiones/nueva')}
          />
          {sesiones.length > 0 && (
            <p className="sesiones__ayuda">Clic para seleccionar · doble clic para abrir · Ctrl o Shift para elegir varias.</p>
          )}
        </div>
      </div>

      {enConfiguracion && (
        <ModalConfiguracionSesion
          sesion={enConfiguracion}
          onCancelar={() => setEnConfiguracion(null)}
          onGuardar={guardarConfiguracion}
        />
      )}

      {porEliminar && (
        <ModalEliminarSesion
          nombres={porEliminar.map((s) => s.nombre)}
          onConfirmar={() => void eliminar(porEliminar)}
          onCancelar={() => setPorEliminar(null)}
        />
      )}

      {registrandoMateria && (
        <ModalRegistrarMateria
          onCancelar={() => setRegistrandoMateria(false)}
          onRegistrada={(materia) => {
            setRegistrandoMateria(false);
            avisos.exito(`Se registró la materia "${materia.nombre}" correctamente.`);
          }}
        />
      )}
    </PlantillaLayout>
  );
}
