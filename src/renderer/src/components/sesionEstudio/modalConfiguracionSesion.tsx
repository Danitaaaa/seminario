import { FormEvent, useEffect, useState } from 'react';
import { Boton } from '../comunes/boton';
import { ModalSuperposicion } from './modalSuperposicion';
import type { Materia, SesionEstudio } from '../../types/sesionesEstudio';
import { aInputFechaHora, desdeInputFechaHora, extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

interface ModalConfiguracionSesionProps {
  sesion: SesionEstudio;
  onCancelar: () => void;
  onGuardar: (cambios: { nombre: string; idMateria: number; fechaProgramada: string }) => Promise<void>;
}

// Modal "Configuraciones de sesión": permite cambiar el nombre, la materia y la fecha de programación.
export function ModalConfiguracionSesion({ sesion, onCancelar, onGuardar }: ModalConfiguracionSesionProps) {
  const [nombre, setNombre] = useState(sesion.nombre);
  const [idMateria, setIdMateria] = useState(sesion.materiaAsociada.idMateria);
  const [materias, setMaterias] = useState<Materia[]>([sesion.materiaAsociada]);
  const [fecha, setFecha] = useState(aInputFechaHora(sesion.fechaProgramada));

  useEffect(() => {
    window.api
      .listarOpcionesSesionEstudio()
      .then((o) => setMaterias(o.materias))
      .catch(() => undefined);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [superpuestas, setSuperpuestas] = useState<SesionEstudio[] | null>(null);

  // Valida los campos y envía los cambios; muestra el error si falla.
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nombre.trim() === '' || fecha === '') {
      setError('Completá el nombre y la fecha.');
      return;
    }
    setGuardando(true);
    setError(null);

    // Si cambió la fecha, revisa si el nuevo horario se cruza con otra sesión (sin contar esta).
    if (desdeInputFechaHora(fecha) !== new Date(sesion.fechaProgramada).toISOString()) {
      try {
        const cruces = await window.api.buscarSesionesSuperpuestas({
          usuarioId: sesion.idUsuario,
          fechaProgramada: desdeInputFechaHora(fecha),
          duracion: sesion.duracion,
          excluirIdSesion: sesion.idSesion,
        });
        if (cruces.length > 0) {
          setSuperpuestas(cruces);
          setGuardando(false);
          return;
        }
      } catch {
        // Si no se pudo revisar, se guarda igual: la advertencia no debe impedir el cambio.
      }
    }
    await guardar();
  }

  async function guardar() {
    setSuperpuestas(null);
    setGuardando(true);
    try {
      await onGuardar({ nombre: nombre.trim(), idMateria, fechaProgramada: desdeInputFechaHora(fecha) });
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo guardar.'));
      setGuardando(false);
    }
  }

  return (
    <div className="sesiones__overlay">
      <form className="sesiones__modal" onSubmit={enviar}>
        <h3 className="sesiones__modal-titulo">Configuraciones de sesión</h3>

        <label className="sesiones__campo">
          Nombre
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <label className="sesiones__campo">
          Materia
          <select value={idMateria} onChange={(e) => setIdMateria(Number(e.target.value))}>
            {materias.map((m) => (
              <option key={m.idMateria} value={m.idMateria}>{m.nombre}</option>
            ))}
          </select>
        </label>

        <label className="sesiones__campo">
          Fecha de programación
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>

        {error && <div className="sesiones__error">{error}</div>}

        <div className="sesiones__modal-acciones">
          <Boton variante="contorno" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            Guardar
          </Boton>
        </div>
      </form>
        {superpuestas && (
        <ModalSuperposicion
          superpuestas={superpuestas}
          textoContinuar="Guardar igual"
          onContinuar={() => void guardar()}
          onCambiar={() => setSuperpuestas(null)}
        />
      )}
    </div>
  );
}
