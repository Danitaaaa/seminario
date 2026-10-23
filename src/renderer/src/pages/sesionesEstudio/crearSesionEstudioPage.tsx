import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ListaObjetivos } from '../../components/sesionEstudio/listaObjetivos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { OpcionesSesionEstudio } from '../../types/sesionesEstudio';
import { aInputFechaHora, desdeInputFechaHora, extraerMensajeError } from './utilidades';
import '../../styles/sesionesEstudio.css';

interface ObjetivoNuevo {
  clave: number;
  descripcion: string;
}

interface PasoProps {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  onCambio: (valor: number) => void;
}

// Selector numérico con botones − y + (usado para los tiempos del Pomodoro).
function Paso({ etiqueta, valor, min, max, onCambio }: PasoProps) {
  return (
    <div className="sesiones__paso">
      <span>{etiqueta} (mins)</span>
      <div className="sesiones__paso-controles">
        <Boton variante="contorno" onClick={() => onCambio(Math.max(min, valor - 1))}>−</Boton>
        <span className="sesiones__paso-valor">{valor}</span>
        <Boton variante="contorno" onClick={() => onCambio(Math.min(max, valor + 1))}>+</Boton>
      </div>
    </div>
  );
}

// Formulario de creación de sesión: nombre, materia, métodos, Pomodoro, fecha, duración y objetivos.
export function CrearSesionEstudioPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const [opciones, setOpciones] = useState<OpcionesSesionEstudio>({ materias: [], metodosEstudio: [] });
  const [nombre, setNombre] = useState('');
  const [idMateria, setIdMateria] = useState<number | ''>('');
  const [idsMetodos, setIdsMetodos] = useState<number[]>([]);
  const [pomodoroMin, setPomodoroMin] = useState(35);
  const [descansoCortoMin, setDescansoCortoMin] = useState(10);
  const [descansoLargoMin, setDescansoLargoMin] = useState(15);
  const [duracion, setDuracion] = useState(60);
  const [fecha, setFecha] = useState(aInputFechaHora(new Date().toISOString()));
  const [recibirNotificacion, setRecibirNotificacion] = useState(false);
  const [objetivos, setObjetivos] = useState<ObjetivoNuevo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    window.api
      .listarOpcionesSesionEstudio()
      .then(setOpciones)
      .catch((e) => setError(extraerMensajeError(e, 'No se pudieron cargar las opciones.')));
  }, []);

  // Agrega o quita un método de estudio de la selección.
  function alternarMetodo(id: number) {
    setIdsMetodos((actuales) => (actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id]));
  }

  // Valida el formulario y crea la sesión; al terminar abre la pantalla de la sesión.
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nombre.trim() === '') return setError('Escribí un nombre para la sesión.');
    if (idMateria === '') return setError('Elegí una materia.');
    if (fecha === '') return setError('Elegí la fecha de la sesión.');

    setEnviando(true);
    setError(null);
    try {
      const creada = await window.api.crearSesionEstudio({
        usuarioId,
        nombre: nombre.trim(),
        idMateria,
        idsMetodosEstudio: idsMetodos,
        duracion,
        pomodoroMin,
        descansoCortoMin,
        descansoLargoMin,
        fechaProgramada: desdeInputFechaHora(fecha),
        recibirNotificacion,
        objetivos: objetivos.map((o) => o.descripcion),
      });
      navigate(`/sesiones/${creada.idSesion}`);
    } catch (e) {
      setError(extraerMensajeError(e, 'No se pudo crear la sesión.'));
      setEnviando(false);
    }
  }

  return (
    <PlantillaLayout titulo="Nueva sesión de estudio" idActivo="sesiones" usuario={{ nombre: 'Usuario' }}>
      <form className="sesiones sesiones__formulario" onSubmit={enviar}>
        <label className="sesiones__campo">
          Nombre
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <label className="sesiones__campo">
          Materia
          <select
            value={idMateria}
            onChange={(e) => setIdMateria(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Elegí una materia</option>
            {opciones.materias.map((m) => (
              <option key={m.idMateria} value={m.idMateria}>{m.nombre}</option>
            ))}
          </select>
        </label>

        <div className="sesiones__campo">
          Métodos de estudio
          <div className="sesiones__chips">
            {opciones.metodosEstudio.map((metodo) => {
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

        <div className="sesiones__fila-campos">
          <Paso etiqueta="Pomodoro" valor={pomodoroMin} min={1} max={180} onCambio={setPomodoroMin} />
          <Paso etiqueta="Short break" valor={descansoCortoMin} min={1} max={60} onCambio={setDescansoCortoMin} />
          <Paso etiqueta="Long break" valor={descansoLargoMin} min={1} max={120} onCambio={setDescansoLargoMin} />
        </div>

        <div className="sesiones__fila-campos">
          <label className="sesiones__campo">
            Fecha de la sesión
            <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="sesiones__campo">
            Duración de la sesión (minutos)
            <input
              type="number"
              min={1}
              max={720}
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="sesiones__check">
          <input
            type="checkbox"
            checked={recibirNotificacion}
            onChange={(e) => setRecibirNotificacion(e.target.checked)}
          />
          Quiero recibir una notificación de esta sesión
        </label>

        <div className="sesiones__campo">
          Objetivos
          <ListaObjetivos
            objetivos={objetivos.map((o) => ({ clave: o.clave, descripcion: o.descripcion, completado: false }))}
            onAgregar={(descripcion) => setObjetivos((a) => [...a, { clave: Date.now() + a.length, descripcion }])}
            onEliminar={(clave) => setObjetivos((a) => a.filter((o) => o.clave !== clave))}
          />
        </div>

        {error && <CartelError mensaje={error} onCerrar={() => setError(null)} />}

        <div className="sesiones__acciones">
          <Boton type="submit" disabled={enviando}>Crear sesión</Boton>
          <Boton variante="contorno" onClick={() => navigate('/sesiones')} disabled={enviando}>Cancelar</Boton>
        </div>
      </form>
    </PlantillaLayout>
  );
}
