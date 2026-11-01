import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalMateria } from '../../components/materias/modalMateria';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { EstadoMateria, Formacion, MateriaFormacion } from '../../types/materias';
import { ESTADOS, NOMBRE_ESTADO, NOMBRE_TIPO, ORGANIZACIONES, agruparPorAnio, mensajeDeError, textoDuracion } from './utilidadesMaterias';
import '../../styles/materias.css';

type Filtro = 'todas' | EstadoMateria;

// Pestaña "Materias": formaciones del usuario y sus materias por año y cuatrimestre.
export function MateriasPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [parametros, setParametros] = useSearchParams();
  const [formaciones, setFormaciones] = useState<Formacion[] | null>(null);
  const [materias, setMaterias] = useState<MateriaFormacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [editando, setEditando] = useState<MateriaFormacion | 'nueva' | null>(parametros.get('nueva') ? 'nueva' : null);
  const [porEliminar, setPorEliminar] = useState<MateriaFormacion | Formacion | null>(null);
  const [error, setError] = useState('');

  const idElegida = Number(parametros.get('f')) || formaciones?.[0]?.idFormacion || 0;
  const formacion = formaciones?.find((f) => f.idFormacion === idElegida) ?? formaciones?.[0] ?? null;

  useEffect(() => {
    window.api.listarFormaciones({ usuarioId })
      .then(setFormaciones)
      .catch((e) => { setFormaciones([]); setError(mensajeDeError(e, 'No se pudieron cargar tus formaciones.')); });
  }, []);

  useEffect(() => {
    if (!formacion) return setMaterias([]);
    cargarMaterias(formacion.idFormacion);
  }, [formacion?.idFormacion]);

  async function cargarMaterias(idFormacion: number): Promise<void> {
    try {
      setMaterias(await window.api.listarMateriasFormacion({ usuarioId, idFormacion }));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las materias.'));
    }
  }

  const cantidades = useMemo(() => {
    const c: Record<EstadoMateria, number> = { no_cursada: 0, cursando: 0, libre: 0, regular: 0, aprobada: 0 };
    materias.forEach((m) => c[m.estado]++);
    return c;
  }, [materias]);

  const anios = useMemo(
    () => agruparPorAnio(filtro === 'todas' ? materias : materias.filter((m) => m.estado === filtro)),
    [materias, filtro]
  );

  async function eliminar(): Promise<void> {
    if (!porEliminar) return;
    try {
      if ('idMateria' in porEliminar) {
        await window.api.eliminarMateriaFormacion({ usuarioId, idMateria: porEliminar.idMateria });
        setMaterias((ms) => ms.filter((m) => m.idMateria !== porEliminar.idMateria));
        avisos.exito('Se eliminó la materia.');
      } else {
        await window.api.eliminarFormacion({ usuarioId, idFormacion: porEliminar.idFormacion });
        setFormaciones((fs) => (fs ?? []).filter((f) => f.idFormacion !== porEliminar.idFormacion));
        setParametros({});
        avisos.exito('Se eliminó la formación con sus materias.');
      }
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo eliminar.'));
    } finally {
      setPorEliminar(null);
    }
  }

  function guardada(materia: MateriaFormacion): void {
    const eraNueva = editando === 'nueva';
    setEditando(null);
    avisos.exito(eraNueva ? 'Se creó la materia.' : 'Se guardaron los cambios.');
    if (materia.idFormacion !== formacion?.idFormacion) setParametros({ f: String(materia.idFormacion) });
    else cargarMaterias(materia.idFormacion);
  }

  const organizacion = ORGANIZACIONES.find((o) => o.valor === formacion?.organizacion)?.nombre.toLowerCase();

  return (
    <PlantillaLayout titulo="Materias" idActivo="materias" usuario={{ nombre: 'Usuario' }}>
      <div className="materias-pagina">
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        {formaciones && formaciones.length === 0 && (
          <section className="materias-vacio">
            <span className="materias-insignia"><GraduationCap size={28} /></span>
            <h2>Todavía no cargaste qué estudiás</h2>
            <p>Agregá tu carrera, curso o academia y después sus materias, a mano o pegando el plan de estudios.</p>
            <Boton onClick={() => navigate('/materias/formacion')}>Agregar formación</Boton>
          </section>
        )}

        {formacion && (
          <>
            <div className="materias-encabezado">
              <div className="materias-pestanas" role="tablist" aria-label="Formaciones">
                {formaciones!.map((f) => (
                  <button key={f.idFormacion} type="button" role="tab" aria-selected={f.idFormacion === formacion.idFormacion}
                    className={`materias-pestana ${f.idFormacion === formacion.idFormacion ? 'materias-pestana--activa' : ''}`}
                    onClick={() => { setFiltro('todas'); setParametros({ f: String(f.idFormacion) }); }}>
                    {f.nombre}
                  </button>
                ))}
                <button type="button" className="materias-pestana materias-pestana--agregar" onClick={() => navigate('/materias/formacion')}>
                  <Plus size={16} /> Agregar formación
                </button>
              </div>
              <div className="materias-botones">
                <Boton variante="contorno" onClick={() => navigate(`/materias/plan/${formacion.idFormacion}`)}><Upload size={16} /> Cargar plan</Boton>
                <Boton onClick={() => setEditando('nueva')}><Plus size={16} /> Nueva materia</Boton>
              </div>
            </div>

            <section className="materias-resumen">
              <div className="materias-resumen__datos">
                <span className="materias-insignia"><GraduationCap size={26} /></span>
                <div>
                  <span className="materias-etiqueta">{NOMBRE_TIPO[formacion.tipo]}</span>
                  <strong>{formacion.nombre}</strong>
                  <span className="materias-detalle">
                    {[formacion.institucion, formacion.duracionAnios && textoDuracion(formacion.duracionAnios), organizacion,
                      formacion.anioActual && `cursando ${formacion.anioActual}° año`].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>
              <div className="materias-resumen__numeros">
                {ESTADOS.map((e) => (
                  <div key={e.valor} className={`materias-numero materias-numero--${e.valor}`}>
                    <strong>{cantidades[e.valor]}</strong><span>{e.nombre}</span>
                  </div>
                ))}
                <div className="materias-resumen__links">
                  <button type="button" className="materias-link" onClick={() => navigate(`/materias/formacion/${formacion.idFormacion}`)}>Editar</button>
                  <button type="button" className="materias-link materias-link--peligro" onClick={() => setPorEliminar(formacion)}>Eliminar</button>
                </div>
              </div>
            </section>

            {materias.length > 0 && (
              <div className="materias-filtros">
                <span>Mostrar:</span>
                {(['todas', ...ESTADOS.map((e) => e.valor)] as Filtro[]).map((f) => (
                  <button key={f} type="button" aria-pressed={filtro === f}
                    className={`materias-chip ${filtro === f ? 'materias-chip--activo' : ''}`} onClick={() => setFiltro(f)}>
                    {f === 'todas' ? 'Todas' : NOMBRE_ESTADO[f]}
                  </button>
                ))}
              </div>
            )}

            {materias.length === 0 && (
              <section className="materias-vacio">
                <h2>Esta formación no tiene materias</h2>
                <p>Pegá el plan de estudios y Syntra arma la lista, o cargalas de a una.</p>
                <div className="materias-botones">
                  <Boton variante="contorno" onClick={() => setEditando('nueva')}>Cargar a mano</Boton>
                  <Boton onClick={() => navigate(`/materias/plan/${formacion.idFormacion}`)}>Cargar plan</Boton>
                </div>
              </section>
            )}

            {anios.map((anio) => (
              <section key={anio.titulo} className="materias-anio">
                <h2>{anio.titulo}</h2>
                {anio.grupos.map((grupo) => (
                  <div key={grupo.titulo} className="materias-grupo">
                    <span className="materias-grupo__titulo">{grupo.titulo}</span>
                    <div className="materias-grilla">
                      {grupo.materias.map((m) => (
                        <article key={m.idMateria} className="materias-tarjeta">
                          <div className="materias-tarjeta__cabecera">
                            <strong>{m.nombre}</strong>
                            <div>
                              <button type="button" className="materias-icono" aria-label={`Editar ${m.nombre}`} onClick={() => setEditando(m)}><Pencil size={16} /></button>
                              <button type="button" className="materias-icono" aria-label={`Eliminar ${m.nombre}`} onClick={() => setPorEliminar(m)}><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <span className={`materias-pildora materias-estado--${m.estado}`}>{NOMBRE_ESTADO[m.estado]}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </>
        )}
      </div>

      {editando && formaciones && formaciones.length > 0 && (
        <ModalMateria
          usuarioId={usuarioId}
          formaciones={formaciones}
          idFormacion={formacion?.idFormacion ?? formaciones[0].idFormacion}
          materia={editando === 'nueva' ? undefined : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={guardada}
        />
      )}

      {porEliminar && (
        <div className="materias-fondo-modal">
          <div className="materias-modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar">
            <h2 id="titulo-eliminar">{'idMateria' in porEliminar ? 'Eliminar materia' : 'Eliminar formación'}</h2>
            <p>
              {'idMateria' in porEliminar
                ? `Se va a eliminar "${porEliminar.nombre}".`
                : `Se van a eliminar "${porEliminar.nombre}" y todas sus materias.`}
            </p>
            <div className="materias-acciones">
              <Boton variante="contorno" onClick={() => setPorEliminar(null)}>Cancelar</Boton>
              <Boton onClick={() => void eliminar()}>Eliminar</Boton>
            </div>
          </div>
        </div>
      )}
    </PlantillaLayout>
  );
}
