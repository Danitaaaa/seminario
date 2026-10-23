import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { EstadoBadge } from '../../components/sesionEstudio/estadoBadge';
import { ModalConfiguracionSesion } from '../../components/sesionEstudio/modalConfiguracionSesion';
import { ModalEliminarSesion } from '../../components/sesionEstudio/modalEliminarSesion';
import { formatearFecha } from '../../utils/formatearFecha';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { SesionEstudio } from '../../types/sesionesEstudio';
import { extraerMensajeError } from './utilidades';
import '../../styles/sesionesEstudio.css';

// Lista de sesiones de estudio con nombre, materia, fechas y estado. Cada fila tiene el menú de tres puntos
// con "Configuraciones" y "Eliminar sesión".
export function SesionesEstudioPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
  const [enConfiguracion, setEnConfiguracion] = useState<SesionEstudio | null>(null);
  const [porEliminar, setPorEliminar] = useState<SesionEstudio | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vuelve a pedir la lista al main.
  const cargar = useCallback(async () => {
    try {
      setSesiones(await window.api.listarSesionesEstudio({ usuarioId }));
      setError(null);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudieron cargar las sesiones.'));
    }
  }, [usuarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Elimina la sesión ya confirmada por el usuario.
  async function eliminar(sesion: SesionEstudio) {
    setPorEliminar(null);
    try {
      await window.api.eliminarSesionEstudio(usuarioId, sesion.idSesion);
      await cargar();
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo eliminar la sesión.'));
    }
  }

  // Guarda los cambios del modal y refresca la lista.
  async function guardarConfiguracion(cambios: { nombre: string; fechaProgramada: string }) {
    if (!enConfiguracion) return;
    await window.api.modificarSesionEstudio({ usuarioId, idSesion: enConfiguracion.idSesion, ...cambios });
    setEnConfiguracion(null);
    await cargar();
  }

  return (
    <PlantillaLayout titulo="Sesiones de estudio" idActivo="sesiones" usuario={{ nombre: 'Usuario' }}>
      <div className="sesiones">
        <div className="sesiones__cabecera">
          <span className="sesiones__cabecera-espacio" />
          <Boton onClick={() => navigate('/sesiones/nueva')}>+ Crear sesión de estudio</Boton>
        </div>

        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} onReintentar={cargar} />}

        <table className="sesiones__tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Materia</th>
              <th>Fecha programada</th>
              <th>Fecha creación</th>
              <th>Último acceso</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sesiones.map((sesion) => (
              <tr key={sesion.idSesion} className="sesiones__fila" onClick={() => navigate(`/sesiones/${sesion.idSesion}`)}>
                <td>{sesion.nombre}</td>
                <td>{sesion.materiaAsociada.nombre}</td>
                <td>{formatearFecha(sesion.fechaProgramada)}</td>
                <td>{formatearFecha(sesion.fechaCreacion)}</td>
                <td>{formatearFecha(sesion.fechaUltimoAcceso)}</td>
                <td>
                  <EstadoBadge estado={sesion.estado} />
                </td>
                <td className="sesiones__celda-menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="app-boton-icono app-boton-icono--plano"
                    aria-label="Más opciones"
                    onClick={() => setMenuAbierto(menuAbierto === sesion.idSesion ? null : sesion.idSesion)}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuAbierto === sesion.idSesion && (
                    <div className="sesiones__menu" role="menu">
                      <button
                        type="button"
                        className="sesiones__menu-opcion"
                        onClick={() => {
                          setMenuAbierto(null);
                          setEnConfiguracion(sesion);
                        }}
                      >
                        Configuraciones
                      </button>
                      <button
                        type="button"
                        className="sesiones__menu-opcion sesiones__menu-opcion--peligro"
                        onClick={() => {
                          setMenuAbierto(null);
                          setPorEliminar(sesion);
                        }}
                      >
                        Eliminar sesión
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sesiones.length === 0 && !error && <p className="sesiones__vacio">Todavía no creaste ninguna sesión de estudio.</p>}
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
          nombre={porEliminar.nombre}
          onConfirmar={() => void eliminar(porEliminar)}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </PlantillaLayout>
  );
}
