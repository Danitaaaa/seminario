import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Boton } from '../../components/comunes/boton';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalCuaderno } from '../../components/cuadernos/modalCuaderno';
import { usarAvisos } from '../../hooks/usarAvisos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import type { ResumenCuaderno } from '../../types/cuadernos';
import { mensajeDeError, nombreAnio } from '../materias/utilidadesMaterias';
import { LOMOS_DE_MUESTRA, altoLomo, fechaCorta, progresoNotas, tonoDe } from './utilidadesCuadernos';
import '../../styles/materias.css';
import '../../styles/cuadernos.css';

// "Mis cuadernos": todos los que creó el usuario, como tapas arriba y como libros en el estante.
export function CuadernosPage() {
  const usuarioId = obtenerUsuarioId() ?? 0;
  const navigate = useNavigate();
  const avisos = usarAvisos();
  const [cuadernos, setCuadernos] = useState<ResumenCuaderno[] | null>(null);
  const [parametros] = useSearchParams();
  const [creando, setCreando] = useState(parametros.get('nuevo') === '1');
  const [error, setError] = useState('');

  async function cargar(): Promise<void> {
    try {
      setCuadernos(await window.api.listarCuadernos({ usuarioId }));
    } catch (e) {
      setCuadernos([]);
      setError(mensajeDeError(e, 'No se pudieron cargar los cuadernos.'));
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function crear(datos: { nombre: string; idMateria: number }): Promise<boolean> {
    try {
      const { idCuaderno } = await window.api.crearCuaderno({ usuarioId, ...datos });
      avisos.exito('Se creó el cuaderno.');
      navigate(`/cuadernos/${idCuaderno}`);
      return true;
    } catch (e) {
      avisos.error(mensajeDeError(e, 'No se pudo crear el cuaderno.'));
      return false;
    }
  }

  const lista = cuadernos ?? [];
  const variasFormaciones = new Set(lista.map((c) => c.materia.formacion)).size > 1;
  const abrir = (c: ResumenCuaderno) => navigate(`/cuadernos/${c.idCuaderno}`);

  const tapa = (c: ResumenCuaderno) => (
    <button key={c.idCuaderno} type="button" className={`cuaderno-tapa cuaderno-tono-${tonoDe(c.idCuaderno)}`} onClick={() => abrir(c)}>
      <span className="cuaderno-tapa__anio">
        {[c.materia.anio ? nombreAnio(c.materia.anio) : null, variasFormaciones ? c.materia.formacion : null].filter(Boolean).join(' · ')}
      </span>
      <strong className="cuaderno-tapa__nombre">{c.nombre}</strong>
      <span className="cuaderno-tapa__pie">
        {c.proximo && <span>{c.proximo.nombre} · {fechaCorta(c.proximo.fecha)}</span>}
        {c.notasTotal > 0 && <span className="cuaderno-tapa__barra"><span style={{ width: `${progresoNotas(c) * 100}%` }} /></span>}
        <small>{[`${c.archivos} ${c.archivos === 1 ? 'archivo' : 'archivos'}`, c.flashcards ? `${c.flashcards} flashcards` : null].filter(Boolean).join(' · ')}</small>
      </span>
    </button>
  );

  return (
    <PlantillaLayout idActivo="material" usuario={{ nombre: 'Usuario' }}>
      <div className="cuadernos-pagina">
        <button type="button" className="materias-link cuaderno-volver" onClick={() => navigate('/material')}>
          <ArrowLeft size={16} /> Volver a Material
        </button>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}

        <header className="cuadernos-encabezado">
          <h1>Mis cuadernos</h1>
          <Boton onClick={() => setCreando(true)}><Plus size={16} /> Nuevo cuaderno</Boton>
        </header>

        {cuadernos && cuadernos.length === 0 && (
          <p className="cuadernos-ayuda">Creá un cuaderno, ponele un nombre y asocialo a una materia: ahí se juntan sus carpetas de Material, sus flashcards, sus sesiones y tus notas.</p>
        )}

        {lista.length > 0 && (
          <section className="cuadernos-seccion">
            <div className="cuadernos-tapas">{lista.map(tapa)}</div>
          </section>
        )}

        {cuadernos && (
          <section className="cuadernos-seccion">
            <div className="cuadernos-seccion__titulo">
              <h2>Estante</h2>
              <button type="button" className="materias-link" onClick={() => navigate('/materias')}>Ver plan completo</button>
            </div>
            <div className="cuadernos-estante">
              {/* Sin cuadernos en el estante, se simula con lomos de muestra. */}
              {lista.length === 0 && LOMOS_DE_MUESTRA.map((alto, i) => (
                <span key={i} className="cuaderno-lomo cuaderno-lomo--muestra" style={{ height: `${alto * 2.6}px` }} aria-hidden="true" />
              ))}
              {lista.map((c) => (
                <button key={c.idCuaderno} type="button" className={`cuaderno-lomo cuaderno-tono-${tonoDe(c.idCuaderno)}`}
                  style={{ height: `${altoLomo(c.nombre) * 2.6}px` }} onClick={() => abrir(c)} title={c.nombre}>
                  <span>{c.nombre}{c.materia.estado === 'regular' ? ' (regular)' : ''}</span>
                </button>
              ))}
              {lista.length === 0 && (
                <button type="button" className="cuaderno-lomo cuaderno-lomo--nuevo" style={{ height: '220px' }} onClick={() => setCreando(true)} title="Nuevo cuaderno">
                  <span>+ Nuevo cuaderno</span>
                </button>
              )}
            </div>
          </section>
        )}

      </div>

      {creando && (
        <ModalCuaderno usadas={lista.map((c) => c.materia.idMateria)} onGuardar={crear} onCerrar={() => setCreando(false)} />
      )}
    </PlantillaLayout>
  );
}
