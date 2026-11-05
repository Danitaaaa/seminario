import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Folder, Layers, Plus, Timer } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalNota } from '../../components/cuadernos/modalNota';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { Cuaderno, DatosNota, Nota } from '../../types/cuadernos';
import type { Cuatrimestre, EstadoMateria } from '../../types/materias';
import { NOMBRE_ESTADO, cuatrimestreCorto, mensajeDeError, nombreAnio } from '../materias/utilidadesMaterias';
import { CORTO_TIPO, NOMBRE_ESTADO_NOTA, fechaCorta, formatoNota, promedio } from './utilidadesCuadernos';
import '../../styles/materias.css';
import '../../styles/cuadernos.css';

// El cuaderno de una materia: sus notas y todo lo que tiene asociado en Material, Flashcards y Sesiones.
export function CuadernoPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const idMateria = Number(useParams().idMateria);
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [cuaderno, setCuaderno] = useState<Cuaderno | null>(null);
  const [editando, setEditando] = useState<Nota | 'nueva' | null>(null);
  const [error, setError] = useState('');

  async function cargar(): Promise<void> {
    try {
      setCuaderno(await window.api.obtenerCuaderno({ usuarioId, idMateria }));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar el cuaderno.'));
    }
  }

  useEffect(() => {
    void cargar();
  }, [idMateria]);

  async function guardarNota(datos: DatosNota): Promise<boolean> {
    try {
      if (editando === 'nueva') await window.api.crearNota({ usuarioId, idMateria, ...datos });
      else if (editando) await window.api.modificarNota({ usuarioId, idNota: editando.idNota, ...datos });
      avisos.exito(editando === 'nueva' ? 'Se cargó la nota.' : 'Se guardaron los cambios.');
      await cargar();
      return true;
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo guardar la nota.'));
      return false;
    }
  }

  async function eliminarNota(nota: Nota): Promise<void> {
    try {
      await window.api.eliminarNota({ usuarioId, idNota: nota.idNota });
      setEditando(null);
      avisos.exito('Se eliminó la nota.');
      await cargar();
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo eliminar la nota.'));
    }
  }

  const r = cuaderno?.resumen;
  const cursado = cuaderno?.notas.filter((n) => n.tipo !== 'final') ?? [];
  const finales = cuaderno?.notas.filter((n) => n.tipo === 'final') ?? [];
  const promedioCursado = promedio(cursado);

  return (
    <PlantillaLayout idActivo="material" usuario={{ nombre: 'Usuario' }}>
      <div className="cuadernos-pagina">
        <button type="button" className="materias-link cuaderno-volver" onClick={() => navigate('/cuadernos')}>
          <ArrowLeft size={16} /> Mis cuadernos
        </button>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {r && cuaderno && (
          <>
            <header className="cuadernos-encabezado">
              <div>
                <span className="materias-detalle">
                  {[r.anio && nombreAnio(r.anio), cuatrimestreCorto(r.cuatrimestre as Cuatrimestre | null), NOMBRE_ESTADO[r.estado as EstadoMateria]].filter(Boolean).join(' · ')}
                </span>
                <h1>{r.nombre}</h1>
              </div>
              <Boton onClick={() => setEditando('nueva')}><Plus size={16} /> Cargar nota</Boton>
            </header>

            <TablaNotas titulo="Cursado" notas={cursado} onEditar={setEditando}
              extra={promedioCursado !== null ? <>Promedio de cursado: <strong>{formatoNota(promedioCursado)}</strong></> : null}
              vacio="Todavía no cargaste parciales ni trabajos." />
            <TablaNotas titulo="Finales" notas={finales} onEditar={setEditando}
              extra={r.estado === 'regular' || r.estado === 'cursando' ? 'Se habilita al regularizar' : null}
              vacio="Todavía no rendiste el final de esta materia." />

            <div className="cuaderno-vinculos">
              <section className="cuaderno-tarjeta">
                <h3>Material vinculado</h3>
                {cuaderno.carpetas.length === 0 && <p className="materias-ayuda">No hay carpetas asociadas a esta materia. Asocialas desde Material, editando la carpeta.</p>}
                <ul>
                  {cuaderno.carpetas.map((c) => (
                    <li key={c.idNodo}><Folder size={16} aria-hidden="true" /> {c.nombre} <small>{c.elementos} elementos</small></li>
                  ))}
                </ul>
                <Boton variante="contorno" onClick={() => navigate('/material')}>Ir a Material</Boton>
              </section>

              <section className="cuaderno-tarjeta">
                <h3>Flashcards</h3>
                {cuaderno.mazos.length === 0 && <p className="materias-ayuda">No hay mazos de esta materia.</p>}
                <ul>
                  {cuaderno.mazos.map((m) => (
                    <li key={m.idDeck}>
                      <button type="button" className="materias-link" onClick={() => navigate(`/flashcards/${m.idDeck}`)}>
                        <Layers size={16} aria-hidden="true" /> {m.nombre}
                      </button>
                      <small>{m.flashcards} tarjetas</small>
                    </li>
                  ))}
                </ul>
                <Boton variante="contorno" onClick={() => navigate('/flashcards')}>Ver flashcards</Boton>
              </section>

              <section className="cuaderno-tarjeta">
                <h3>Sesiones de estudio</h3>
                {cuaderno.sesiones.length === 0 && <p className="materias-ayuda">Todavía no hay sesiones de esta materia.</p>}
                <ul>
                  {cuaderno.sesiones.map((s) => (
                    <li key={s.idSesion}>
                      <button type="button" className="materias-link" onClick={() => navigate(`/sesiones/${s.idSesion}`)}>
                        <Timer size={16} aria-hidden="true" /> {s.nombre}
                      </button>
                      <small>{fechaCorta(s.fecha)}</small>
                    </li>
                  ))}
                </ul>
                <Boton variante="contorno" onClick={() => navigate('/sesiones/nueva')}>Nueva sesión</Boton>
              </section>
            </div>
          </>
        )}
      </div>

      {editando && (
        <ModalNota
          nota={editando === 'nueva' ? undefined : editando}
          onGuardar={guardarNota}
          onEliminar={editando === 'nueva' ? undefined : () => void eliminarNota(editando)}
          onCerrar={() => setEditando(null)}
        />
      )}
    </PlantillaLayout>
  );
}

interface TablaNotasProps {
  titulo: string;
  notas: Nota[];
  extra: ReactNode;
  vacio: string;
  onEditar: (nota: Nota) => void;
}

function TablaNotas({ titulo, notas, extra, vacio, onEditar }: TablaNotasProps) {
  return (
    <section className="cuaderno-notas">
      <header className="cuaderno-notas__titulo">
        <h2>{titulo}</h2>
        {extra && <span>{extra}</span>}
      </header>
      {notas.length === 0 && <p className="cuaderno-notas__vacio">{vacio}</p>}
      {notas.map((n) => (
        <button key={n.idNota} type="button" className="cuaderno-nota" onClick={() => onEditar(n)}>
          <span className={`cuaderno-nota__tipo cuaderno-nota__tipo--${n.tipo}`}>{CORTO_TIPO[n.tipo]}</span>
          <span className="cuaderno-nota__nombre">{n.nombre}</span>
          <span className="cuaderno-nota__fecha">{fechaCorta(n.fecha)}</span>
          <span className={`cuaderno-estado cuaderno-estado--${n.estado}`}>{NOMBRE_ESTADO_NOTA[n.estado]}</span>
          <span className={`cuaderno-nota__valor cuaderno-nota__valor--${n.estado}`}>{n.nota === null ? '—' : formatoNota(n.nota)}</span>
        </button>
      ))}
    </section>
  );
}
