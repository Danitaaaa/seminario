import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Plus, Upload } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalMateria } from '../../components/materias/modalMateria';
import { ProgresoFormacion } from '../../components/materias/progresoFormacion';
import { VistaTablero } from '../../components/materias/vistaTablero';
import { VistaPorAnio } from '../../components/materias/vistaPorAnio';
import { VistaCorrelativas } from '../../components/materias/vistaCorrelativas';
import { usarPreferencia } from '../../hooks/usarPreferencia';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { Correlativa, EstadoMateria, Formacion, MateriaFormacion } from '../../types/materias';
import { NOMBRE_TIPO, ORGANIZACIONES, mensajeDeError, textoDuracion } from './utilidadesMaterias';
import '../../styles/materias.css';

type Vista = 'plan' | 'correlativas';
type VistaPlan = 'estado' | 'anio';

const VISTAS: { valor: Vista; nombre: string }[] = [
  { valor: 'plan', nombre: 'Plan de estudios' },
  { valor: 'correlativas', nombre: 'Correlatividades' },
];

// Pestaña "Materias": formaciones del usuario y sus materias (tablero por estado y correlatividades).
export function MateriasPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [parametros, setParametros] = useSearchParams();
  const [formaciones, setFormaciones] = useState<Formacion[] | null>(null);
  const [materias, setMaterias] = useState<MateriaFormacion[]>([]);
  const [correlativas, setCorrelativas] = useState<Correlativa[]>([]);
  const [vista, setVista] = usarPreferencia<Vista>('materias-vista', 'plan');
  const [vistaPlan, setVistaPlan] = usarPreferencia<VistaPlan>('materias-vista-plan', 'estado');
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
    if (!formacion) {
      setMaterias([]);
      setCorrelativas([]);
      return;
    }
    cargarMaterias(formacion.idFormacion);
  }, [formacion?.idFormacion]);

  async function cargarMaterias(idFormacion: number): Promise<void> {
    try {
      setMaterias(await window.api.listarMateriasFormacion({ usuarioId, idFormacion }));
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar las materias.'));
    }
    // Aparte: si fallan las correlativas, las materias se ven igual.
    try {
      setCorrelativas(await window.api.listarCorrelativas({ usuarioId, idFormacion }));
    } catch (e) {
      setCorrelativas([]);
      setError(mensajeDeError(e, 'No se pudieron cargar las correlativas.'));
    }
  }


  async function eliminar(): Promise<void> {
    if (!porEliminar) return;
    try {
      if ('idMateria' in porEliminar) {
        await window.api.eliminarMateriaFormacion({ usuarioId, idMateria: porEliminar.idMateria });
        setMaterias((ms) => ms.filter((m) => m.idMateria !== porEliminar.idMateria));
        setCorrelativas((cs) => cs.filter((c) => c.idMateria !== porEliminar.idMateria && c.idRequisito !== porEliminar.idMateria));
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

  // Se cambia en pantalla al soltar y se vuelve atrás si no se pudo guardar.
  async function cambiarEstado(materia: MateriaFormacion, estado: EstadoMateria): Promise<void> {
    const reemplazar = (m: MateriaFormacion) => setMaterias((ms) => ms.map((x) => (x.idMateria === m.idMateria ? m : x)));
    reemplazar({ ...materia, estado });
    try {
      const { idMateria, nombre, anio, cuatrimestre } = materia;
      reemplazar(await window.api.modificarMateriaFormacion({ usuarioId, idMateria, nombre, anio, cuatrimestre, estado }));
    } catch (e) {
      reemplazar(materia);
      avisos.error(mensajeDeError(e, 'No se pudo cambiar el estado.'));
    }
  }

  async function guardarCorrelativas(idMateria: number, requisitos: number[]): Promise<boolean> {
    try {
      const nuevas = await window.api.guardarCorrelativas({ usuarioId, idMateria, requisitos });
      setCorrelativas((cs) => [...cs.filter((c) => c.idMateria !== idMateria), ...nuevas]);
      avisos.exito('Se guardaron las correlativas.');
      return true;
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudieron guardar las correlativas.'));
      return false;
    }
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
                    onClick={() => setParametros({ f: String(f.idFormacion) })}>
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

            <section className="materias-cabecera">
              <div>
                <span className="materias-etiqueta">{NOMBRE_TIPO[formacion.tipo]}</span>
                <h2 className="materias-cabecera__nombre">{formacion.nombre}</h2>
                <span className="materias-detalle">
                  {[formacion.institucion, formacion.duracionAnios && textoDuracion(formacion.duracionAnios), organizacion,
                    formacion.anioActual && `cursando ${formacion.anioActual}° año`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div className="materias-resumen__links">
                <button type="button" className="materias-link" onClick={() => navigate(`/materias/formacion/${formacion.idFormacion}`)}>Editar</button>
                <button type="button" className="materias-link materias-link--peligro" onClick={() => setPorEliminar(formacion)}>Eliminar</button>
              </div>
            </section>

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

            {materias.length > 0 && (
              <>
                <ProgresoFormacion materias={materias} />

                <div className="materias-vistas" role="tablist" aria-label="Vista">
                  {VISTAS.map((v) => (
                    <button key={v.valor} type="button" role="tab" aria-selected={vista === v.valor}
                      className={vista === v.valor ? 'materias-vistas--activa' : ''} onClick={() => setVista(v.valor)}>
                      {v.nombre}
                    </button>
                  ))}
                </div>

                {vista === 'plan' && (
                  <>
                    <div className="materias-plan-barra">
                      <div className="materias-segmento" role="group" aria-label="Ver el plan">
                        <button type="button" aria-pressed={vistaPlan === 'estado'} className={vistaPlan === 'estado' ? 'materias-segmento--activo' : ''} onClick={() => setVistaPlan('estado')}>Por estado</button>
                        <button type="button" aria-pressed={vistaPlan === 'anio'} className={vistaPlan === 'anio' ? 'materias-segmento--activo' : ''} onClick={() => setVistaPlan('anio')}>Por año</button>
                      </div>
                    </div>
                    {vistaPlan === 'estado'
                      ? <VistaTablero materias={materias} onEditar={setEditando} onCambiarEstado={(m, e) => void cambiarEstado(m, e)} />
                      : <VistaPorAnio materias={materias} onEditar={setEditando} onEliminar={setPorEliminar} />}
                  </>
                )}
                {vista === 'correlativas' && <VistaCorrelativas materias={materias} correlativas={correlativas} onGuardar={guardarCorrelativas} />}
              </>
            )}
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
