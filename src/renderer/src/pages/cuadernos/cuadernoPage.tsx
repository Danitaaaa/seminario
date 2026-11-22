import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, ClipboardList, Eye, EyeOff, FileText, Folder, Layers, Pencil, Plus, Timer, X, type LucideIcon } from 'lucide-react';
import { RUTA_TIPO_IA, type MaterialIA, type TipoMaterialIA } from '../../types/ia';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalNota } from '../../components/cuadernos/modalNota';
import { ModalCuaderno } from '../../components/cuadernos/modalCuaderno';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { Cuaderno, DatosCuaderno, DatosNota, Nota } from '../../types/cuadernos';
import type { Deck } from '../../types/flashcards';
import type { Cuatrimestre, EstadoMateria } from '../../types/materias';
import { NOMBRE_ESTADO, cuatrimestreCorto, mensajeDeError, nombreAnio } from '../materias/utilidadesMaterias';
import { CORTO_TIPO, NOMBRE_ESTADO_NOTA, fechaCorta, formatoNota, promedio } from './utilidadesCuadernos';
import '../../styles/materias.css';
import '../../styles/cuadernos.css';

// Si el usuario ocultó el promedio, se recuerda en esta compu.
const CLAVE_OCULTAR_PROMEDIO = 'syntra.cuaderno.ocultarPromedio';
function leerOcultarPromedio(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTAR_PROMEDIO) === 'true';
  } catch {
    return false;
  }
}

// Un cuaderno: sus notas y todo lo que tiene su materia en Material, Flashcards y Sesiones.
export function CuadernoPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const idCuaderno = Number(useParams().idCuaderno);
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [cuaderno, setCuaderno] = useState<Cuaderno | null>(null);
  const [editando, setEditando] = useState<Nota | 'nueva' | null>(null);
  const [ocultarPromedio, setOcultarPromedio] = useState(leerOcultarPromedio);
  const cambiarOcultarPromedio = (ocultar: boolean) => {
    setOcultarPromedio(ocultar);
    try {
      localStorage.setItem(CLAVE_OCULTAR_PROMEDIO, String(ocultar));
    } catch {
      /* sin almacenamiento: queda solo para esta vez */
    }
  };
  const [editandoCuaderno, setEditandoCuaderno] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [misMazos, setMisMazos] = useState<Deck[]>([]);
  const [misMaterialesIA, setMisMaterialesIA] = useState<MaterialIA[]>([]);
  const [error, setError] = useState('');

  async function cargar(): Promise<void> {
    try {
      setCuaderno(await window.api.obtenerCuaderno({ usuarioId, idCuaderno }));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar el cuaderno.'));
    }
  }

  useEffect(() => {
    void cargar();
  }, [idCuaderno]);

  useEffect(() => {
    window.api.listarDecks(usuarioId).then(setMisMazos).catch(() => setMisMazos([]));
    window.api.listarMaterialesIA().then(setMisMaterialesIA).catch(() => setMisMaterialesIA([]));
  }, []);

  // Mazos agregados a mano. Los de la materia o de sus sesiones salen solos.
  async function agregarMazo(idDeck: number): Promise<void> {
    try {
      await window.api.agregarMazoCuaderno({ usuarioId, idCuaderno, idDeck });
      await cargar();
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo agregar el mazo.'));
    }
  }

  // Cuestionarios, mapas mentales y resúmenes hechos con IA: se agregan o sacan del cuaderno como los mazos.
  async function agregarMaterialIA(idMaterialIA: number): Promise<void> {
    try {
      await window.api.agregarMaterialIACuaderno({ usuarioId, idCuaderno, idMaterialIA });
      await cargar();
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo agregar.'));
    }
  }

  async function quitarMaterialIA(idMaterialIA: number): Promise<void> {
    try {
      await window.api.quitarMaterialIACuaderno({ usuarioId, idCuaderno, idMaterialIA });
      await cargar();
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo sacar.'));
    }
  }

  async function quitarMazo(idDeck: number): Promise<void> {
    try {
      await window.api.quitarMazoCuaderno({ usuarioId, idCuaderno, idDeck });
      await cargar();
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo sacar el mazo.'));
    }
  }

  async function guardarNota(datos: DatosNota): Promise<boolean> {
    try {
      if (editando === 'nueva') await window.api.crearNota({ usuarioId, idCuaderno, ...datos });
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

  async function guardarCuaderno(datos: DatosCuaderno): Promise<boolean> {
    try {
      await window.api.modificarCuaderno({ usuarioId, idCuaderno, ...datos });
      avisos.exito('Se guardaron los cambios.');
      await cargar();
      return true;
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo guardar el cuaderno.'));
      return false;
    }
  }

  async function eliminarCuaderno(): Promise<void> {
    try {
      await window.api.eliminarCuaderno({ usuarioId, idCuaderno });
      avisos.exito('Se eliminó el cuaderno.');
      navigate('/cuadernos');
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo eliminar el cuaderno.'));
      setConfirmarBorrado(false);
    }
  }

  // Abre Material directo en la carpeta de la materia.
  const abrirCarpeta = (c: { idNodo: number; nombre: string }) =>
    navigate(`/material?carpeta=${c.idNodo}&nombre=${encodeURIComponent(c.nombre)}`);

  const r = cuaderno?.resumen;
  const materia = r?.materia;
  const cursado = cuaderno?.notas.filter((n) => n.tipo !== 'final') ?? [];
  const finales = cuaderno?.notas.filter((n) => n.tipo === 'final') ?? [];
  const promedioCursado = promedio(cursado);
  const promedioGeneral = promedio(cuaderno?.notas ?? []);

  return (
    <PlantillaLayout idActivo="material" usuario={{ nombre: 'Usuario' }}>
      <div className="cuadernos-pagina">
        <button type="button" className="materias-link cuaderno-volver" onClick={() => navigate('/cuadernos')}>
          <ArrowLeft size={16} /> Mis cuadernos
        </button>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {r && materia && cuaderno && (
          <>
            <header className="cuadernos-encabezado">
              <div>
                <span className="materias-detalle">
                  {[materia.nombre !== r.nombre ? materia.nombre : null, materia.anio && nombreAnio(materia.anio),
                    r.cuatrimestre ? r.cuatrimestre.corto : cuatrimestreCorto(materia.cuatrimestre as Cuatrimestre | null),
                    // El estado de la materia es el de la cursada más nueva; las anteriores ya terminaron.
                    cuaderno.cursadas.length > 1 && !cuaderno.cursadas[0].actual ? 'Cursada anterior' : NOMBRE_ESTADO[materia.estado as EstadoMateria]]
                    .filter(Boolean).join(' · ')}
                </span>
                <h1>{r.nombre}</h1>
                {cuaderno.cursadas.length > 1 && (
                  <div className="cuaderno-cursadas" role="group" aria-label="Otras veces que cursaste la materia">
                    <span>Cursadas:</span>
                    {cuaderno.cursadas.map((c) => (
                      <button key={c.idCuaderno} type="button" aria-current={c.actual ? 'page' : undefined}
                        className={`cuadernos-chip${c.actual ? ' cuadernos-chip--activo' : ''}`}
                        onClick={() => !c.actual && navigate(`/cuadernos/${c.idCuaderno}`)}>
                        {c.cuatrimestre ?? 'Sin cuatrimestre'}
                      </button>
                    ))}
                  </div>
                )}
                {cuaderno.cuentaPara.length > 0 && (
                  <p className="cuaderno-cuenta-para">
                    Cuenta para: {[`${materia.nombre} · ${materia.formacion}`, ...cuaderno.cuentaPara.map((m) => `${m.nombre} · ${m.formacion}`)].join(' y ')}
                  </p>
                )}
              </div>
              <div className="materias-botones">
                <Boton variante="contorno" onClick={() => setEditandoCuaderno(true)}><Pencil size={16} /> Editar</Boton>
                <Boton onClick={() => setEditando('nueva')}><Plus size={16} /> Cargar nota</Boton>
              </div>
            </header>

            {promedioGeneral !== null && (
              <div className={`cuaderno-promedio${ocultarPromedio ? ' cuaderno-promedio--oculto' : ''}`}>
                {!ocultarPromedio && (
                  <span>
                    Promedio de tus notas: <strong>{formatoNota(promedioGeneral)}</strong>
                  </span>
                )}
                <button type="button" className="materias-link" aria-pressed={ocultarPromedio} onClick={() => cambiarOcultarPromedio(!ocultarPromedio)}>
                  {ocultarPromedio ? <><Eye size={15} /> Mostrar promedio</> : <><EyeOff size={15} /> Ocultar</>}
                </button>
              </div>
            )}

            <TablaNotas titulo="Cursado" notas={cursado} onEditar={setEditando}
              extra={promedioCursado !== null && !ocultarPromedio ? <>Promedio de cursado: <strong>{formatoNota(promedioCursado)}</strong></> : null}
              vacio="Todavía no cargaste parciales ni trabajos." />
            <TablaNotas titulo="Finales" notas={finales} onEditar={setEditando}
              extra={materia.estado === 'regular' || materia.estado === 'cursando' ? 'Se habilita al regularizar' : null}
              vacio="Todavía no rendiste el final de esta materia." />

            <div className="cuaderno-vinculos">
              <section className="cuaderno-tarjeta">
                <h3>Material vinculado</h3>
                {cuaderno.carpetas.length === 0 && <p className="materias-ayuda">No hay carpetas asociadas a esta materia. Asocialas desde Material, editando la carpeta.</p>}
                <ul>
                  {cuaderno.carpetas.map((c) => (
                    <li key={c.idNodo}>
                      <button type="button" className="materias-link" onClick={() => abrirCarpeta(c)}>
                        <Folder size={16} aria-hidden="true" /> {c.nombre}
                      </button>
                      <small>{c.elementos} elementos</small>
                    </li>
                  ))}
                </ul>
                <Boton variante="contorno" onClick={() => (cuaderno.carpetas.length === 1 ? abrirCarpeta(cuaderno.carpetas[0]) : navigate('/material'))}>
                  {cuaderno.carpetas.length === 1 ? 'Abrir carpeta' : 'Ir a Material'}
                </Boton>
              </section>

              <section className="cuaderno-tarjeta cuaderno-tarjeta--metodos">
                <h3>Métodos de estudio</h3>
                {cuaderno.metodos.length > 0 && (
                  <div className="cuaderno-metodos-usados" aria-label="Métodos usados en tus sesiones">
                    <span>En tus sesiones:</span>
                    {cuaderno.metodos.map((m) => (
                      <span key={m.nombre} className="cuaderno-metodo-chip">
                        {m.nombre} · {m.sesiones} {m.sesiones === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    ))}
                  </div>
                )}
                <h4><Layers size={16} aria-hidden="true" /> Flashcards</h4>
                {cuaderno.mazos.length === 0 && <p className="materias-ayuda">Todavía no hay mazos. Los que uses en una sesión de esta materia aparecen solos, o agregalos acá.</p>}
                <ul>
                  {cuaderno.mazos.map((m) => (
                    <li key={m.idDeck}>
                      <button type="button" className="materias-link" onClick={() => navigate(`/flashcards/${m.idDeck}`)}>
                        <Layers size={16} aria-hidden="true" /> {m.nombre}
                      </button>
                      <small>
                        {m.flashcards} tarjetas
                        {m.aMano && (
                          <button type="button" className="cuaderno-quitar" aria-label={`Sacar ${m.nombre} del cuaderno`} title="Sacar del cuaderno" onClick={() => void quitarMazo(m.idDeck)}>
                            <X size={14} />
                          </button>
                        )}
                      </small>
                    </li>
                  ))}
                </ul>
                {misMazos.some((d) => !cuaderno.mazos.some((m) => m.idDeck === d.idDeck)) && (
                  <select className="cuaderno-agregar" value="" aria-label="Agregar un mazo al cuaderno"
                    onChange={(e) => e.target.value && void agregarMazo(Number(e.target.value))}>
                    <option value="">+ Agregar mazo…</option>
                    {misMazos.filter((d) => !cuaderno.mazos.some((m) => m.idDeck === d.idDeck)).map((d) => (
                      <option key={d.idDeck} value={d.idDeck}>{d.nombre}</option>
                    ))}
                  </select>
                )}
                {TIPOS_IA_CUADERNO.map(({ tipo, titulo, singular, icono }) => (
                  <ListaMaterialIA
                    key={tipo}
                    tipo={tipo}
                    titulo={titulo}
                    singular={singular}
                    icono={icono}
                    enCuaderno={cuaderno.materialesIA.filter((m) => m.tipo === tipo)}
                    disponibles={misMaterialesIA.filter((m) => m.tipo === tipo && !cuaderno.materialesIA.some((c) => c.idMaterialIA === m.idMaterialIA))}
                    onAbrir={(id) => navigate(tipo === 'resumen' ? `/resumenes/${id}` : `${RUTA_TIPO_IA[tipo]}/${id}`)}
                    onAgregar={(id) => void agregarMaterialIA(id)}
                    onQuitar={(id) => void quitarMaterialIA(id)}
                  />
                ))}
                <div className="materias-botones">
                  <Boton variante="contorno" onClick={() => navigate('/flashcards')}>Ver flashcards</Boton>
                  <Boton variante="contorno" onClick={() => navigate('/metodos')}>Todos los métodos</Boton>
                </div>
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

      {editandoCuaderno && r && (
        <ModalCuaderno
          cuaderno={r}
          cuentaPara={cuaderno?.cuentaPara.map((m) => m.idMateria)}
          usadas={[]}
          onGuardar={guardarCuaderno}
          onEliminar={() => { setEditandoCuaderno(false); setConfirmarBorrado(true); }}
          onCerrar={() => setEditandoCuaderno(false)}
        />
      )}

      {confirmarBorrado && r && (
        <div className="materias-fondo-modal">
          <div className="materias-modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-borrar-cuaderno">
            <h2 id="titulo-borrar-cuaderno">Eliminar cuaderno</h2>
            <p>Se va a eliminar "{r.nombre}" con sus notas. La materia, sus carpetas, mazos y sesiones no se tocan.</p>
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={() => setConfirmarBorrado(false)}>Cancelar</Boton>
              <Boton onClick={() => void eliminarCuaderno()}>Eliminar</Boton>
            </div>
          </div>
        </div>
      )}

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

const TIPOS_IA_CUADERNO: { tipo: TipoMaterialIA; titulo: string; singular: string; icono: LucideIcon }[] = [
  { tipo: 'cuestionario', titulo: 'Cuestionarios', singular: 'cuestionario', icono: ClipboardList },
  { tipo: 'mapaMental', titulo: 'Mapas mentales', singular: 'mapa mental', icono: Brain },
  { tipo: 'resumen', titulo: 'Resúmenes', singular: 'resumen', icono: FileText },
];

interface ListaMaterialIAProps {
  tipo: TipoMaterialIA;
  titulo: string;
  singular: string;
  icono: LucideIcon;
  enCuaderno: { idMaterialIA: number; titulo: string }[];
  disponibles: MaterialIA[];
  onAbrir: (id: number) => void;
  onAgregar: (id: number) => void;
  onQuitar: (id: number) => void;
}

// Igual que los mazos: lo que está en el cuaderno, con ✕ para sacarlo, y "+ Agregar…" con lo que falta.
function ListaMaterialIA({ titulo, singular, icono: Icono, enCuaderno, disponibles, onAbrir, onAgregar, onQuitar }: ListaMaterialIAProps) {
  return (
    <>
      <h4><Icono size={16} aria-hidden="true" /> {titulo}</h4>
      {enCuaderno.length === 0 && disponibles.length === 0 && (
        <p className="materias-ayuda">Todavía no generaste ningún {singular} con IA.</p>
      )}
      <ul>
        {enCuaderno.map((m) => (
          <li key={m.idMaterialIA}>
            <button type="button" className="materias-link" onClick={() => onAbrir(m.idMaterialIA)}>
              <Icono size={16} aria-hidden="true" /> {m.titulo}
            </button>
            <small>
              <button type="button" className="cuaderno-quitar" aria-label={`Sacar ${m.titulo} del cuaderno`} title="Sacar del cuaderno" onClick={() => onQuitar(m.idMaterialIA)}>
                <X size={14} />
              </button>
            </small>
          </li>
        ))}
      </ul>
      {disponibles.length > 0 && (
        <select className="cuaderno-agregar" value="" aria-label={`Agregar un ${singular} al cuaderno`}
          onChange={(e) => e.target.value && onAgregar(Number(e.target.value))}>
          <option value="">+ Agregar {singular}…</option>
          {disponibles.map((m) => <option key={m.idMaterialIA} value={m.idMaterialIA}>{m.titulo}</option>)}
        </select>
      )}
    </>
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
