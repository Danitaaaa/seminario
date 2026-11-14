// src/renderer/src/pages/materias/cargarPlanPage.tsx
import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardPaste, FileUp, Plus, Sparkles, TriangleAlert } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { apiIA, nuevoTrabajoIA } from '../../utils/apiMaterialIA';
import { IndicadorIA } from '../../components/materialIA/indicadorIA';
import { EXTENSIONES_IMAGEN, imagenesDePlan } from '../../utils/imagenesDePlan';
import type { Cuatrimestre, EstadoMateria, Formacion } from '../../types/materias';
import { CUATRIMESTRES, ESTADOS, PROMPT_PLAN, estadoInicial, mensajeDeError } from './utilidadesMaterias';
import type { PreguntaPlanIA } from '../../../../preload/apis/materialIA';
import { Pasos } from './formacionPage';
import '../../styles/materias.css';

interface Fila {
  clave: number;
  incluir: boolean;
  nombre: string;
  anio: string;
  cuatrimestre: Cuatrimestre | '';
  estado: EstadoMateria;
  correlativas: string; // nombres separados con ";"
}

interface MateriaLeida {
  nombre: string;
  anio: number | null;
  cuatrimestre: Cuatrimestre | null;
  correlativas: string[];
}

const separar = (texto: string) => texto.split(';').map((t) => t.trim()).filter(Boolean);
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Lo que se le mandó a la IA, para volver a pedírselo con las respuestas del usuario.
interface PlanParaIA {
  nombre: string;
  imagenes?: string[];
  textoPlan?: string;
}

const EJEMPLO = 'Primer año\nPrimer cuatrimestre\nÁlgebra y Geometría Analítica\nAnálisis Matemático I\nAnual\nAlgoritmos y Estructuras de Datos\n\nSegundo año\n...';

export function CargarPlanPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const idFormacion = Number(useParams().idFormacion);
  const [formacion, setFormacion] = useState<Formacion | null>(null);
  const [formaciones, setFormaciones] = useState<Formacion[]>([]);
  const [texto, setTexto] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [estadoCursadas, setEstadoCursadas] = useState<EstadoMateria>('libre');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);
  // Solo cuando ya la está leyendo la IA (para mostrar la animación de "Generando").
  const [leyendoConIA, setLeyendoConIA] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Preguntas de la IA cuando el plan tiene algo para elegir (varias carreras, orientaciones…).
  const [preguntasIA, setPreguntasIA] = useState<PreguntaPlanIA[] | null>(null);
  const [respuestasIA, setRespuestasIA] = useState<string[]>([]);
  const planParaIA = useRef<PlanParaIA | null>(null);
  // Lo que ya contestó en vueltas anteriores (como en un chat: primero la carrera, después la orientación…).
  const [respondidas, setRespondidas] = useState<{ pregunta: string; respuesta: string }[]>([]);
  const trabajoIA = useRef<ReturnType<typeof nuevoTrabajoIA> | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.api.listarFormaciones({ usuarioId })
      .then((fs) => {
        setFormaciones(fs);
        setFormacion(fs.find((f) => f.idFormacion === idFormacion) ?? null);
      })
      .catch((e) => setError(mensajeDeError(e, 'No se pudo cargar la formación.')));
  }, [idFormacion]);

  const anioActual = formacion?.anioActual ?? null;
  const momento = { anioActual, cuatrimestreActual: formacion?.cuatrimestreActual ?? null };
  const pideCuatrimestre = formacion?.organizacion === 'cuatrimestral';
  const ocupado = trabajando || leyendoArchivo;

  function armarFilas(leidas: MateriaLeida[]): void {
    setFilas(leidas.map((m, i) => ({
      clave: i, incluir: true, nombre: m.nombre, anio: m.anio ? String(m.anio) : '',
      cuatrimestre: m.cuatrimestre ?? '', estado: estadoInicial(m.anio, m.cuatrimestre, momento, estadoCursadas),
      correlativas: m.correlativas.join('; '),
    })));
  }

  async function leer(): Promise<void> {
    setTrabajando(true);
    setError('');
    try {
      const leidas = await window.api.leerPlanEstudios({ texto });
      if (leidas.length === 0) return setError('No se encontraron materias. Revisá que haya una materia por línea.');
      armarFilas(leidas);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo leer el plan.'));
    } finally {
      setTrabajando(false);
    }
  }

  // La IA pasa el plan a texto con el prompt de siempre. Si el plan tiene algo para elegir
  // (por ejemplo, varias carreras), primero devuelve las preguntas y se espera la respuesta del usuario.
  // Devuelve false si no hubo IA disponible (para seguir sin ella).
  async function leerConIA(plan: PlanParaIA, respuestas: { pregunta: string; respuesta: string }[] = []): Promise<boolean> {
    setLeyendoConIA(true);
    trabajoIA.current = nuevoTrabajoIA();
    try {
      const r = await apiIA().transcribirPlanIA({
        trabajoId: trabajoIA.current.id, nombre: plan.nombre, prompt: PROMPT_PLAN,
        imagenes: plan.imagenes, textoPlan: plan.textoPlan, respuestas,
      });
      if (!r.ok) {
        // Con texto sacado del archivo, si la IA no está o falla, el texto queda tal cual en el cuadro.
        if (plan.textoPlan) return false;
        if (r.causa !== 'cancelado') setError(r.mensaje);
        return true;
      }
      setNombreArchivo(plan.nombre);
      if (r.preguntas.length) {
        planParaIA.current = plan;
        setRespondidas(respuestas);
        setRespuestasIA([]);
        setPreguntasIA(r.preguntas);
        return true;
      }
      setPreguntasIA(null);
      setTexto(r.texto);
      avisos.exito('La IA pasó el plan a texto. Revisalo y tocá "Leer plan".');
      return true;
    } finally {
      trabajoIA.current = null;
      setLeyendoConIA(false);
    }
  }

  // Carga del archivo:
  //  1. La app saca el texto sola si puede (PDF con texto, Word) y se lo pasa a la IA para ordenarlo.
  //     Si no hay ninguna IA disponible, el texto queda tal cual en el cuadro, como antes.
  //  2. Si no hay texto (PDF escaneado o foto), la IA lee las páginas como imágenes.
  //  3. Si la IA pregunta algo, se contesta y recién ahí aparece el texto. Después se revisa y se toca "Leer plan".
  async function cargarArchivo(archivo: File | undefined): Promise<void> {
    if (!archivo || ocupado) return;
    setError('');
    setPreguntasIA(null);
    setRespondidas([]);
    setLeyendoArchivo(true);
    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
      const ruta = window.api.rutaDeArchivo(archivo);

      if (ruta && !EXTENSIONES_IMAGEN.includes(extension)) {
        let extraido: { nombre: string; texto: string } | null = null;
        try {
          extraido = await apiIA().extraerTextoPlan({ ruta });
        } catch {
          // Sin texto seleccionable: sigue con las imágenes.
        }
        if (extraido) {
          const conIA = await leerConIA({ nombre: extraido.nombre, textoPlan: extraido.texto });
          if (!conIA) {
            setNombreArchivo(extraido.nombre);
            setTexto(extraido.texto);
          }
          return;
        }
      }

      setLeyendoConIA(true);
      const imagenes = await imagenesDePlan(archivo);
      if (imagenes.length === 0) {
        setLeyendoConIA(false);
        return setError('No se pudo leer el archivo. Probá con un PDF, una foto del plan o pegá el texto a mano.');
      }
      await leerConIA({ nombre: archivo.name, imagenes });
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo leer el archivo.'));
    } finally {
      setLeyendoConIA(false);
      setLeyendoArchivo(false);
    }
  }

  // El usuario eligió una opción: pasa a la siguiente pregunta o, si era la última, la IA transcribe.
  async function responderIA(opcion: string): Promise<void> {
    if (!preguntasIA || !planParaIA.current) return;
    const respuestas = [...respuestasIA, opcion];
    if (respuestas.length < preguntasIA.length) return setRespuestasIA(respuestas);
    const plan = planParaIA.current;
    const pares = [...respondidas, ...preguntasIA.map((p, i) => ({ pregunta: p.pregunta, respuesta: respuestas[i] }))];
    setPreguntasIA(null);
    setLeyendoArchivo(true);
    setError('');
    try {
      await leerConIA(plan, pares);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo leer el archivo.'));
    } finally {
      setLeyendoArchivo(false);
    }
  }

  function cancelarLecturaIA(): void {
    void trabajoIA.current?.cancelar();
  }

  async function copiarPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(PROMPT_PLAN);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError('No se pudo copiar. Seleccioná el texto del prompt y copialo a mano.');
    }
  }

  function cambiar(clave: number, cambios: Partial<Fila>): void {
    setFilas((fs) => fs!.map((f) => {
      if (f.clave !== clave) return f;
      const nueva = { ...f, ...cambios };
      if (cambios.anio !== undefined || cambios.cuatrimestre !== undefined) {
        nueva.estado = estadoInicial(nueva.anio ? Number(nueva.anio) : null, nueva.cuatrimestre || null, momento, estadoCursadas);
      }
      return nueva;
    }));
  }

  function cambiarEstadoCursadas(estado: EstadoMateria): void {
    setEstadoCursadas(estado);
    setFilas((fs) => fs!.map((f) => ({ ...f, estado: estadoInicial(f.anio ? Number(f.anio) : null, f.cuatrimestre || null, momento, estado) })));
  }

  const elegidas = filas?.filter((f) => f.incluir) ?? [];
  const dudosas = filas?.filter((f) => f.incluir && !f.anio).length ?? 0;
  const noCursadas = elegidas.filter((f) => f.estado === 'no_cursada').length;
  const nombres = new Set(elegidas.map((f) => normalizar(f.nombre)));
  const sueltas = (f: Fila) => separar(f.correlativas).filter((c) => !nombres.has(normalizar(c)));
  const sinCoincidir = elegidas.reduce((n, f) => n + sueltas(f).length, 0);

  async function agregar(): Promise<void> {
    if (elegidas.some((f) => !f.nombre.trim())) return setError('Hay materias sin nombre.');
    setTrabajando(true);
    setError('');
    try {
      const creadas = await window.api.crearMaterias({
        usuarioId, idFormacion,
        materias: elegidas.map((f) => ({
          nombre: f.nombre.trim(), anio: f.anio ? Number(f.anio) : null, cuatrimestre: f.cuatrimestre || null, estado: f.estado,
          correlativas: separar(f.correlativas),
        })),
      });
      avisos.exito(`Se agregaron ${creadas.length} materias.`);
      navigate(`/materias?f=${idFormacion}`);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron agregar las materias.'));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <PlantillaLayout titulo="Cargar plan de estudios" idActivo="materias" usuario={{ nombre: 'Usuario' }}>
      <div className={`materias-pagina ${filas ? '' : 'materias-pagina--angosto'}`}>
        <Pasos actual={filas ? 3 : 2} />

        {/* Bien a la vista en qué formación se cargan las materias, y se puede cambiar antes de empezar. */}
        <div className="plan-destino">
          <label>
            Las materias se van a cargar en
            <select
              value={idFormacion}
              disabled={ocupado || !!filas}
              onChange={(e) => navigate(`/materias/plan/${e.target.value}`)}
            >
              {formaciones.map((f) => <option key={f.idFormacion} value={f.idFormacion}>{f.nombre}</option>)}
            </select>
          </label>
          {!filas && (
            <button type="button" className="materias-link" onClick={() => navigate('/materias/formacion')} disabled={ocupado}>
              <Plus size={15} /> Crear otra formación
            </button>
          )}
        </div>

        {!filas && (
          <section className="materias-panel">
            <div className="materias-resumen__datos">
              <span className="materias-insignia"><ClipboardPaste size={26} /></span>
              <div>
                <span className="materias-etiqueta">Carga automática{formacion ? ` · ${formacion.nombre}` : ''}</span>
                <h2>Cargá tu plan de estudios</h2>
                <p className="materias-detalle">Subí el archivo del plan (PDF, Word o texto). El sistema intentará leerlo automáticamente y, si es un escaneo, la IA se encargará de extraer el texto en el cuadro de abajo.</p>
              </div>
            </div>

            <div
              className="materias-prompt"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void cargarArchivo(e.dataTransfer.files[0]); }}
            >
              <div>
                <strong>Subí el archivo de tu plan</strong>
                <span>PDF (también escaneado), Word (.docx), texto o una foto del plan. También podés arrastrarlo hasta acá.</span>
                {nombreArchivo && (
                  <small>
                    {preguntasIA ? `${nombreArchivo} · La IA lo leyó y necesita que confirmes un par de cosas antes de transcribirlo.` : `Archivo: ${nombreArchivo}`}
                  </small>
                )}
              </div>
              <Boton variante="contorno" onClick={() => entradaArchivo.current?.click()} disabled={ocupado}>
                <FileUp size={16} /> {leyendoArchivo && !leyendoConIA ? 'Leyendo archivo…' : nombreArchivo ? 'Cambiar archivo' : 'Elegir archivo'}
              </Boton>
              <input
                ref={entradaArchivo}
                type="file"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                hidden
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  void cargarArchivo(archivo);
                }}
              />
            </div>

            {leyendoConIA && (
              <>
                <IndicadorIA
                  mensaje="Leyendo el plan con IA"
                  detalle="La app no pudo leer el texto del archivo (parece escaneado). La IA lo está pasando a texto; puede tardar un poco."
                />
                <div className="materias-acciones">
                  <Boton variante="contorno" onClick={cancelarLecturaIA}>Cancelar generación</Boton>
                </div>
              </>
            )}

            {preguntasIA && !leyendoConIA && (
              <section className="plan-ia-ayuda" aria-live="polite">
                <header className="plan-ia-ayuda__cabecera">
                  <span>La IA necesita tu ayuda</span>
                  <span>Pregunta {respuestasIA.length + 1} de {preguntasIA.length}</span>
                </header>
                {respondidas.length > 0 && (
                  <p className="plan-ia-ayuda__elegido">
                    Ya elegiste: {respondidas.map((r) => r.respuesta).join(' · ')}
                  </p>
                )}
                <p className="plan-ia-ayuda__pregunta">
                  <span className="plan-ia-ayuda__chispa" aria-hidden="true"><Sparkles size={16} /></span>
                  {preguntasIA[respuestasIA.length].pregunta}
                </p>
                <div className="plan-ia-ayuda__opciones" role="radiogroup" aria-label={preguntasIA[respuestasIA.length].pregunta} data-voz-grupo>
                  {preguntasIA[respuestasIA.length].opciones.map((opcion) => (
                    <button key={opcion} type="button" role="radio" aria-checked={false} className="plan-ia-ayuda__opcion" onClick={() => void responderIA(opcion)}>
                      <span className="plan-ia-ayuda__circulo" aria-hidden="true" /> {opcion}
                    </button>
                  ))}
                </div>
                {respuestasIA.length > 0 && (
                  <button type="button" className="materias-link" onClick={() => setRespuestasIA((r) => r.slice(0, -1))}>Volver a la pregunta anterior</button>
                )}
              </section>
            )}

            <label className="materias-campo">O pegá el texto del plan
              <textarea rows={10} value={texto} placeholder={EJEMPLO} disabled={ocupado} onChange={(e) => setTexto(e.target.value)} />
            </label>
            <p className="materias-ayuda">
              Una vez que aparezca el texto en el cuadro, revisalo y tocá "Leer plan" para armar la lista definitiva de materias. Todavía no se guarda nada.
            </p>
            <p className="materias-ayuda">
              ¿Es una foto o un formato especial?{' '}
              <button type="button" className="materias-link" onClick={() => void copiarPrompt()}>
                {copiado ? 'Prompt copiado ✓' : 'Copiá este prompt'}
              </button>
              , pegalo en cualquier IA junto con tu plan y pegá acá lo que te devuelva.
            </p>

            {error && <p className="materias-error" role="alert">{error}</p>}
            <div className="materias-acciones materias-acciones--separadas">
              <button type="button" className="materias-link" onClick={() => navigate(`/materias?f=${idFormacion}&nueva=1`)} disabled={ocupado}>Prefiero cargarlas a mano</button>
              <div className="materias-botones">
                <Boton onClick={() => void leer()} disabled={!texto.trim() || ocupado}>{trabajando ? 'Leyendo…' : 'Leer plan'}</Boton>
              </div>
            </div>
          </section>
        )}

        {filas && (
          <>
            <div className="materias-encabezado">
              <div className="materias-titulo">
                <h2>Se encontraron {filas.length} materias</h2>
                <p>Corregí lo que haga falta y destildá las que no quieras agregar.</p>
                <div className="materias-chips-resumen">
                  <span className="materias-pildora materias-estado--libre">{elegidas.length} seleccionadas</span>
                  {anioActual && <span className="materias-pildora materias-estado--cursando">{elegidas.filter((f) => f.estado === 'cursando').length} cursando ({anioActual}° año{momento.cuatrimestreActual ? `, ${momento.cuatrimestreActual === 'primero' ? '1er' : '2do'} cuatrimestre` : ''})</span>}
                  {anioActual && <span className="materias-pildora materias-estado--no_cursada">{noCursadas} no cursadas (después de {anioActual}° año)</span>}
                </div>
              </div>
              <label className="materias-campo materias-campo--linea">Estado de las que ya cursaste
                <select value={estadoCursadas} onChange={(e) => cambiarEstadoCursadas(e.target.value as EstadoMateria)}>
                  {ESTADOS.filter((e) => e.valor !== 'no_cursada' && e.valor !== 'cursando').map((e) => <option key={e.valor} value={e.valor}>{e.nombre}</option>)}
                </select>
              </label>
            </div>

            {dudosas > 0 && (
              <div className="materias-alerta" role="status">
                <TriangleAlert size={20} />
                {dudosas === 1 ? 'A 1 materia le falta el año.' : `A ${dudosas} materias les falta el año.`} Quedaron resaltadas.
              </div>
            )}

            {sinCoincidir > 0 && (
              <div className="materias-alerta" role="status">
                <TriangleAlert size={20} />
                {sinCoincidir === 1 ? '1 correlativa no coincide' : `${sinCoincidir} correlativas no coinciden`} con ninguna materia de la lista y no se va a guardar. Corregí el nombre o borrala.
              </div>
            )}

            <div className="materias-tabla">
              <table>
                <thead>
                  <tr>
                    <th scope="col"><input type="checkbox" aria-label="Seleccionar todas" checked={elegidas.length === filas.length}
                      onChange={(e) => setFilas(filas.map((f) => ({ ...f, incluir: e.target.checked })))} /></th>
                    <th scope="col">Materia</th>
                    <th scope="col">Año</th>
                    <th scope="col">Cuatrimestre</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Correlativas</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => {
                    const falta = f.incluir && !f.anio;
                    const nuevoAnio = i === 0 || filas[i - 1].anio !== f.anio;
                    const cantidad = filas.filter((x) => x.anio === f.anio).length;
                    return (
                      <Fragment key={f.clave}>
                      {nuevoAnio && (
                        <tr className="materias-tabla__anio">
                          <td colSpan={6}>{f.anio ? `${f.anio}° año` : 'Sin año'} <small>{cantidad} {cantidad === 1 ? 'materia' : 'materias'}</small></td>
                        </tr>
                      )}
                      <tr className={`${f.incluir ? '' : 'materias-fila--fuera'} ${falta ? 'materias-fila--dudosa' : ''}`}>
                        <td><input type="checkbox" checked={f.incluir} aria-label={`Agregar ${f.nombre}`} onChange={(e) => cambiar(f.clave, { incluir: e.target.checked })} /></td>
                        <td><input value={f.nombre} maxLength={100} aria-label="Nombre" onChange={(e) => cambiar(f.clave, { nombre: e.target.value })} /></td>
                        <td><input type="number" min={1} max={10} value={f.anio} aria-label="Año" className={!f.anio && f.incluir ? 'materias-falta' : ''} onChange={(e) => cambiar(f.clave, { anio: e.target.value })} /></td>
                        <td>
                          <select value={f.cuatrimestre} aria-label="Cuatrimestre"
                            onChange={(e) => cambiar(f.clave, { cuatrimestre: e.target.value as Cuatrimestre | '' })}>
                            <option value="">{pideCuatrimestre ? 'Sin definir' : '—'}</option>
                            {CUATRIMESTRES.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
                          </select>
                        </td>
                        <td>
                          <select value={f.estado} aria-label="Estado" className={`materias-select-estado materias-estado--${f.estado}`} onChange={(e) => cambiar(f.clave, { estado: e.target.value as EstadoMateria })}>
                            {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.nombre}</option>)}
                          </select>
                        </td>
                        <td>
                          <input value={f.correlativas} placeholder="Ninguna" aria-label={`Correlativas de ${f.nombre}`}
                            title={sueltas(f).length ? `No coinciden: ${sueltas(f).join(', ')}` : 'Separalas con ;'}
                            className={f.incluir && sueltas(f).length ? 'materias-falta' : ''}
                            onChange={(e) => cambiar(f.clave, { correlativas: e.target.value })} />
                        </td>
                      </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <p className="materias-error" role="alert">{error}</p>}

            <div className="materias-acciones materias-acciones--separadas">
              <button type="button" className="materias-link" onClick={() => setFilas([...filas, {
                clave: Date.now(), incluir: true, nombre: '', anio: '', cuatrimestre: '', estado: estadoCursadas, correlativas: '',
              }])}><Plus size={16} /> Agregar una que falte</button>
              <div className="materias-botones">
                <Boton variante="contorno" onClick={() => setFilas(null)}>Volver al texto</Boton>
                <Boton onClick={() => void agregar()} disabled={elegidas.length === 0 || trabajando}>
                  {trabajando ? 'Agregando…' : `Agregar ${elegidas.length} ${elegidas.length === 1 ? 'materia' : 'materias'}${formacion ? ` a ${formacion.nombre}` : ''}`}
                </Boton>
              </div>
            </div>
          </>
        )}
      </div>
    </PlantillaLayout>
  );
}