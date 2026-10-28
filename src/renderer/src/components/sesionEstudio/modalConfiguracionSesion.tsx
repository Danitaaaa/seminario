import { FormEvent, useEffect, useState } from 'react';
import { Boton } from '../comunes/boton';
import { ModalSuperposicion } from './modalSuperposicion';
import type { Materia, SesionEstudio, TipoMetodoEstudio } from '../../types/sesionesEstudio';
import type { Deck } from '../../types/flashcards';
import { claseDeMetodo } from '../../utils/metodosEstudio';
import { aInputFechaHora, desdeInputFechaHora, extraerMensajeError } from '../../pages/sesionesEstudio/utilidades';

interface ModalConfiguracionSesionProps {
  sesion: SesionEstudio;
  onCancelar: () => void;
  onGuardar: (cambios: CambiosSesion) => Promise<void>;
}

export interface CambiosSesion {
  nombre: string;
  idMateria: number;
  fechaProgramada: string;
  idsMetodosEstudio: number[];
  idDeck?: number | null;
}

// Modal "Configuraciones de sesión": nombre, materia, fecha de programación, métodos de estudio
// y, si entre los métodos está Flashcards, el mazo que se repasa.
export function ModalConfiguracionSesion({ sesion, onCancelar, onGuardar }: ModalConfiguracionSesionProps) {
  const [nombre, setNombre] = useState(sesion.nombre);
  const [idMateria, setIdMateria] = useState(sesion.materiaAsociada.idMateria);
  const [materias, setMaterias] = useState<Materia[]>([sesion.materiaAsociada]);
  const [fecha, setFecha] = useState(aInputFechaHora(sesion.fechaProgramada));
  const [metodos, setMetodos] = useState<TipoMetodoEstudio[]>(sesion.metodosEstudio);
  const [idsMetodos, setIdsMetodos] = useState<number[]>(sesion.metodosEstudio.map((m) => m.idTipoMetodoEstudio));
  const [mazos, setMazos] = useState<Deck[]>([]);
  const [idDeck, setIdDeck] = useState<number | ''>(sesion.idDeck ?? '');

  useEffect(() => {
    window.api
      .listarOpcionesSesionEstudio()
      .then((o) => {
        setMaterias(o.materias);
        setMetodos(o.metodosEstudio);
      })
      .catch(() => undefined);
    window.api.listarDecks(sesion.idUsuario).then(setMazos).catch(() => setMazos([]));
  }, []);

  // Agrega o quita un método de la selección.
  function alternarMetodo(id: number) {
    setIdsMetodos((actuales) => (actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id]));
  }

  const conFlashcards = metodos.some(
    (m) => idsMetodos.includes(m.idTipoMetodoEstudio) && claseDeMetodo(m.nombre) === 'flashcards'
  );
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
      await onGuardar({
        nombre: nombre.trim(),
        idMateria,
        fechaProgramada: desdeInputFechaHora(fecha),
        idsMetodosEstudio: idsMetodos,
        // El mazo solo se toca si la sesión tiene Flashcards.
        ...(conFlashcards ? { idDeck: idDeck === '' ? null : idDeck } : {}),
      });
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

        <div className="sesiones__campo">
          Métodos de estudio
          <div className="sesiones__chips">
            {metodos.map((metodo) => {
              const elegido = idsMetodos.includes(metodo.idTipoMetodoEstudio);
              return (
                <button
                  key={metodo.idTipoMetodoEstudio}
                  type="button"
                  aria-pressed={elegido}
                  className={`sesiones__chip ${elegido ? 'sesiones__chip--activo' : ''}`}
                  onClick={() => alternarMetodo(metodo.idTipoMetodoEstudio)}
                >
                  {metodo.nombre}
                </button>
              );
            })}
          </div>
        </div>

        {conFlashcards && (
          <label className="sesiones__campo">
            Mazo de flashcards para repasar
            {mazos.length === 0 ? (
              <span className="sesion__nota">Todavía no tenés mazos. Crealos en Métodos → Flashcards.</span>
            ) : (
              <select value={idDeck} onChange={(e) => setIdDeck(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Elegirlo después</option>
                {mazos.map((m) => (
                  <option key={m.idDeck} value={m.idDeck}>
                    {m.nombre}{m.cantidadFlashcards !== undefined ? ` (${m.cantidadFlashcards})` : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

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
