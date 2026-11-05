import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { DatosFormacion, Organizacion, TipoFormacion } from '../../types/materias';
import { ORGANIZACIONES, TIPOS_FORMACION, cuatrimestreDeHoy, mensajeDeError } from './utilidadesMaterias';
import { enterParaAvanzar } from '../../utils/enterParaAvanzar';
import '../../styles/materias.css';

type Carga = 'plan' | 'mano';

// Las carreras se cursan por años y cuatrimestres; cursos, academias e institutos no.
const ES_CARRERA: TipoFormacion[] = ['grado', 'pregrado', 'posgrado'];
const ORGANIZACIONES_SIN_CUATRI = ORGANIZACIONES.filter((o) => o.valor !== 'cuatrimestral');

// Alta y edición de una formación: qué estudia el usuario y cómo se organiza.
export function FormacionPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const idEditando = Number(useParams().idFormacion) || null;

  const [tipo, setTipo] = useState<TipoFormacion>('grado');
  const [nombre, setNombre] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [duracion, setDuracion] = useState('');
  const [organizacion, setOrganizacion] = useState<Organizacion>('cuatrimestral');
  const [anioActual, setAnioActual] = useState('');
  const [cuatriActual, setCuatriActual] = useState<'primero' | 'segundo' | ''>(cuatrimestreDeHoy());
  const [carga, setCarga] = useState<Carga>('plan');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const esCarrera = ES_CARRERA.includes(tipo);

  useEffect(() => {
    if (!idEditando) return;
    window.api.listarFormaciones({ usuarioId }).then((fs) => {
      const f = fs.find((x) => x.idFormacion === idEditando);
      if (!f) return setError('La formación no existe.');
      setTipo(f.tipo);
      setNombre(f.nombre);
      setInstitucion(f.institucion ?? '');
      setDuracion(f.duracionAnios ? String(f.duracionAnios) : '');
      setOrganizacion(f.organizacion);
      setAnioActual(f.anioActual ? String(f.anioActual) : '');
      setCuatriActual(f.cuatrimestreActual ?? '');
    }).catch((e) => setError(mensajeDeError(e, 'No se pudo cargar la formación.')));
  }, [idEditando]);

  // Fuera de las carreras no hay cuatrimestres: si estaba elegido, pasa a módulos o niveles.
  function cambiarTipo(nuevo: TipoFormacion): void {
    setTipo(nuevo);
    if (!ES_CARRERA.includes(nuevo) && organizacion === 'cuatrimestral') setOrganizacion('modulos');
  }

  async function guardar(e: FormEvent): Promise<void> {
    e.preventDefault();
    await guardarCon(carga);
  }

  // Tocar "Pegar el plan" o "Cargarlas a mano" guarda y lleva directo a esa pantalla, igual que "Continuar".
  async function guardarCon(cargaElegida: Carga): Promise<void> {
    if (guardando) return;
    setCarga(cargaElegida);
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    if (!duracion) return setError('Poné cuántos años dura.');
    if (!anioActual) return setError('Poné en qué año estás.');
    if (organizacion === 'cuatrimestral' && !cuatriActual) return setError('Elegí en qué cuatrimestre estás.');
    const datos: DatosFormacion = {
      tipo, nombre: nombre.trim(), institucion: institucion.trim() || null,
      duracionAnios: duracion ? Number(duracion) : null, organizacion, anioActual: anioActual ? Number(anioActual) : null,
      cuatrimestreActual: organizacion === 'cuatrimestral' && anioActual ? cuatriActual || null : null,
    };
    setGuardando(true);
    setError('');
    try {
      if (idEditando) {
        await window.api.modificarFormacion({ usuarioId, idFormacion: idEditando, ...datos });
        avisos.exito('Se guardaron los cambios.');
        navigate(`/materias?f=${idEditando}`);
      } else {
        const creada = await window.api.crearFormacion({ usuarioId, ...datos });
        navigate(cargaElegida === 'plan' ? `/materias/plan/${creada.idFormacion}` : `/materias?f=${creada.idFormacion}&nueva=1`);
      }
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la formación.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PlantillaLayout titulo={idEditando ? 'Editar formación' : 'Nueva formación'} idActivo="materias" usuario={{ nombre: 'Usuario' }}>
      <form ref={formulario} className="materias-pagina materias-pagina--angosto" onSubmit={guardar}
        onKeyDown={enterParaAvanzar(() => formulario.current?.requestSubmit())}>
        {!idEditando && <Pasos actual={1} />}

        <div className="materias-titulo">
          <h2>¿Qué estás estudiando?</h2>
          <p>Elegí el tipo de formación. Podés tener varias a la vez, por ejemplo una carrera y un curso de idioma.</p>
        </div>

        <fieldset className="materias-campo materias-campo--grupo">
          <legend>Tipo de formación</legend>
          <div className="materias-opciones">
            {TIPOS_FORMACION.map((t) => (
              <label key={t.valor} className={`materias-opcion ${tipo === t.valor ? 'materias-opcion--activa' : ''}`}>
                <input type="radio" name="tipo" checked={tipo === t.valor} onChange={() => cambiarTipo(t.valor)} />
                <span><strong>{t.nombre}</strong><small>{t.ejemplo}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className="materias-panel">
          <label className="materias-campo">Nombre *
            <input value={nombre} maxLength={150} placeholder="Ingeniería en Sistemas de Información" onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="materias-campo">Institución
            <input value={institucion} maxLength={150} placeholder="UTN · Facultad Regional Villa María" onChange={(e) => setInstitucion(e.target.value)} />
          </label>
          <div className="materias-fila">
            <label className="materias-campo">Duración (años) *
              <input type="number" min={0.5} max={10} step={0.5} value={duracion} placeholder="Ej. 5 o 2,5" onChange={(e) => setDuracion(e.target.value)} />
            </label>
            <label className="materias-campo">{esCarrera ? '¿En qué año estás? *' : '¿En qué año o nivel estás? *'}
              <input type="number" min={1} max={10} value={anioActual} onChange={(e) => setAnioActual(e.target.value)} />
            </label>
          </div>
          <label className="materias-campo">¿Cómo se organiza el cursado?
            <select value={organizacion} onChange={(e) => setOrganizacion(e.target.value as Organizacion)}>
              {(esCarrera ? ORGANIZACIONES : ORGANIZACIONES_SIN_CUATRI).map((o) => <option key={o.valor} value={o.valor}>{o.nombre}</option>)}
            </select>
          </label>
          {organizacion === 'cuatrimestral' && anioActual && (
            <fieldset className="materias-campo materias-campo--grupo">
              <legend>¿En qué cuatrimestre estás? *</legend>
              <div className="materias-estados">
                {(['primero', 'segundo'] as const).map((c) => (
                  <label key={c} className={`materias-estado-opcion materias-estado--cursando ${cuatriActual === c ? 'materias-estado-opcion--activa' : ''}`}>
                    <input type="radio" name="cuatriActual" checked={cuatriActual === c} onChange={() => setCuatriActual(c)} />
                    {c === 'primero' ? '1er cuatrimestre' : '2do cuatrimestre'}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="materias-ayuda">
            {organizacion === 'cuatrimestral'
              ? 'Con esto Syntra arma los estados: lo que ya pasó queda como Libre (lo cambiás después), lo de este cuatrimestre y las anuales de este año como Cursando, y lo que viene como No cursada.'
              : 'Con esto Syntra arma los estados: lo de años o niveles anteriores queda como Libre (lo cambiás después), lo de este como Cursando y lo que viene como No cursada.'}
          </p>
        </section>

        {!idEditando && (
          <fieldset className="materias-campo materias-campo--grupo">
            <legend>¿Cómo querés cargar las materias?</legend>
            <div className="materias-opciones materias-opciones--dos">
              <label className={`materias-opcion ${carga === 'plan' ? 'materias-opcion--activa' : ''}`}>
                <input type="radio" name="carga" checked={carga === 'plan'} onChange={() => void guardarCon('plan')} onClick={() => carga === 'plan' && void guardarCon('plan')} />
                <span><strong>Pegar el plan de estudios</strong><small>Syntra lee el texto y arma las materias{esCarrera ? ' por año y cuatrimestre' : ''}. Las revisás antes de guardarlas.</small></span>
              </label>
              <label className={`materias-opcion ${carga === 'mano' ? 'materias-opcion--activa' : ''}`}>
                <input type="radio" name="carga" checked={carga === 'mano'} onChange={() => void guardarCon('mano')} onClick={() => carga === 'mano' && void guardarCon('mano')} />
                <span><strong>Cargarlas a mano</strong><small>Ideal para cursos cortos o si no tenés el plan a mano.</small></span>
              </label>
            </div>
          </fieldset>
        )}

        {error && <p className="materias-error" role="alert">{error}</p>}

        <div className="materias-acciones">
          <Boton variante="contorno" onClick={() => navigate(idEditando ? `/materias?f=${idEditando}` : '/materias')}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : idEditando ? 'Guardar cambios' : 'Continuar'}</Boton>
        </div>
      </form>
    </PlantillaLayout>
  );
}

export function Pasos({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol className="materias-pasos" aria-label="Pasos">
      {['Formación', 'Materias', 'Revisar'].map((nombre, i) => (
        <li key={nombre} className={i + 1 < actual ? 'materias-paso--hecho' : i + 1 === actual ? 'materias-paso--actual' : ''}
          aria-current={i + 1 === actual ? 'step' : undefined}>
          <span>{i + 1 < actual ? '✓' : i + 1}</span>{nombre}
        </li>
      ))}
    </ol>
  );
}
