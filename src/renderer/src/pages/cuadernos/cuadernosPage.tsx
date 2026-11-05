import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalMateria } from '../../components/materias/modalMateria';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { ResumenCuaderno } from '../../types/cuadernos';
import type { Formacion } from '../../types/materias';
import { mensajeDeError, nombreAnio } from '../materias/utilidadesMaterias';
import { agruparCuadernos, altoLomo, fechaCorta, progresoNotas, tonoDe } from './utilidadesCuadernos';
import '../../styles/cuadernos.css';

const MAXIMO_PROXIMAS = 8;

// "Mis cuadernos": uno por materia. Arriba las que se cursan, abajo el estante con las aprobadas y regulares.
export function CuadernosPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [cuadernos, setCuadernos] = useState<ResumenCuaderno[] | null>(null);
  const [formaciones, setFormaciones] = useState<Formacion[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  async function cargar(): Promise<void> {
    try {
      const [lista, fs] = await Promise.all([window.api.listarCuadernos({ usuarioId }), window.api.listarFormaciones({ usuarioId })]);
      setCuadernos(lista);
      setFormaciones(fs);
    } catch (e) {
      setCuadernos([]);
      setError(mensajeDeError(e, 'No se pudieron cargar los cuadernos.'));
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  const variasFormaciones = new Set((cuadernos ?? []).map((c) => c.formacion)).size > 1;
  const { cursando, estante, proximamente } = agruparCuadernos(cuadernos ?? []);
  const abrir = (c: ResumenCuaderno) => navigate(`/cuadernos/${c.idMateria}`);

  return (
    <PlantillaLayout idActivo="material" usuario={{ nombre: 'Usuario' }}>
      <div className="cuadernos-pagina">
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        <header className="cuadernos-encabezado">
          <h1>Mis cuadernos</h1>
          <Boton onClick={() => (formaciones.length ? setCreando(true) : navigate('/materias/formacion'))}>
            <Plus size={16} /> Nueva materia
          </Boton>
        </header>

        {cuadernos && cuadernos.length === 0 && (
          <section className="materias-vacio">
            <h2>Todavía no tenés cuadernos</h2>
            <p>Cada materia que cargues tiene su cuaderno, con su material, sus flashcards y sus notas.</p>
            <Boton onClick={() => navigate('/materias')}>Cargar materias</Boton>
          </section>
        )}

        {cursando.length > 0 && (
          <section className="cuadernos-seccion">
            <h2>Cursando ahora</h2>
            <div className="cuadernos-tapas">
              {cursando.map((c) => (
                <button key={c.idMateria} type="button" className={`cuaderno-tapa cuaderno-tono-${tonoDe(c.idMateria)}`} onClick={() => abrir(c)}>
                  <span className="cuaderno-tapa__anio">{[c.anio ? nombreAnio(c.anio) : null, variasFormaciones ? c.formacion : null].filter(Boolean).join(' · ')}</span>
                  <strong className="cuaderno-tapa__nombre">{c.nombre}</strong>
                  <span className="cuaderno-tapa__pie">
                    <span>{c.proximo ? `${c.proximo.nombre} · ${fechaCorta(c.proximo.fecha)}` : 'Sin fechas cargadas'}</span>
                    <span className="cuaderno-tapa__barra"><span style={{ width: `${progresoNotas(c) * 100}%` }} /></span>
                    <small>{[`${c.archivos} ${c.archivos === 1 ? 'archivo' : 'archivos'}`, c.flashcards ? `${c.flashcards} flashcards` : null].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {estante.length > 0 && (
          <section className="cuadernos-seccion">
            <div className="cuadernos-seccion__titulo">
              <h2>Estante · aprobadas y regulares</h2>
              <button type="button" className="materias-link" onClick={() => navigate('/materias')}>Ver plan completo</button>
            </div>
            <div className="cuadernos-estante">
              {estante.map((c) => (
                <button key={c.idMateria} type="button" className={`cuaderno-lomo cuaderno-tono-${tonoDe(c.idMateria)}`}
                  style={{ height: `${altoLomo(c.nombre) * 2.6}px` }} onClick={() => abrir(c)} title={c.nombre}>
                  <span>{c.nombre}{c.estado === 'regular' ? ' (regular)' : ''}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {proximamente.length > 0 && (
          <section className="cuadernos-proximas">
            <span>Próximamente ({proximamente.length} sin cursar):</span>
            {proximamente.slice(0, MAXIMO_PROXIMAS).map((c) => (
              <button key={c.idMateria} type="button" className="cuadernos-proxima" onClick={() => abrir(c)}>{c.nombre}</button>
            ))}
            {proximamente.length > MAXIMO_PROXIMAS && <span>y {proximamente.length - MAXIMO_PROXIMAS} más</span>}
          </section>
        )}
      </div>

      {creando && formaciones.length > 0 && (
        <ModalMateria
          usuarioId={usuarioId}
          formaciones={formaciones}
          idFormacion={formaciones[0].idFormacion}
          onCerrar={() => setCreando(false)}
          onGuardada={() => {
            setCreando(false);
            avisos.exito('Se creó la materia con su cuaderno.');
            void cargar();
          }}
        />
      )}
    </PlantillaLayout>
  );
}
