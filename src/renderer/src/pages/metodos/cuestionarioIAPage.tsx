import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { TemasAReforzar } from '../../components/ia/resultadoCuestionario';
import { type CuestionarioParaResolver, type IntentoCuestionario, type MaterialIA } from '../../types/ia';
import { formatearFecha, mensajeError, porcentaje } from './utilidadesMetodosIA';
import styles from '../../styles/metodos.module.css';
import '../../styles/metodosIA.css';

// Un cuestionario guardado: cuántas preguntas tiene, el historial de intentos y qué reforzar.
export function CuestionarioIAPage() {
  const idMaterialIA = Number(useParams().id);
  const navigate = useNavigate();
  const [material, setMaterial] = useState<MaterialIA | null>(null);
  const [intentos, setIntentos] = useState<IntentoCuestionario[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      window.api.obtenerMaterialIA({ idMaterialIA }),
      window.api.listarIntentosCuestionario({ idMaterialIA }),
    ])
      .then(([m, lista]) => {
        setMaterial(m);
        setIntentos(lista);
      })
      .catch((e) => setError(mensajeError(e, 'No se pudo abrir el cuestionario.')));
  }, [idMaterialIA]);

  const cuestionario = material?.contenido as CuestionarioParaResolver | undefined;
  const ultimo = intentos[0];
  const temas = cuestionario ? [...new Set(cuestionario.preguntas.map((p) => p.tema))] : [];

  return (
    <PlantillaLayout titulo="Cuestionarios" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <Link className={styles.backLink} to="/cuestionarios"><ArrowLeft size={17} /> Cuestionarios</Link>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}
        {!material && !error && <p className={styles.emptyText} role="status">Cargando…</p>}

        {material && cuestionario && (
          <>
            <section className={styles.reviewPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>{cuestionario.titulo}</h2>
                  <p>
                    {cuestionario.preguntas.length} preguntas
                    {material.nombreArchivo && <> · De: {material.nombreArchivo}</>}
                    {' · '}{formatearFecha(material.fechaCreacion)}
                  </p>
                </div>
                <Button onClick={() => navigate(`/cuestionarios/${idMaterialIA}/resolver`)}>
                  {intentos.length ? 'Volver a resolver' : 'Resolver'}
                </Button>
              </div>
              {temas.length > 0 && <p className="cuestionario__temas">Temas: {temas.join(' · ')}</p>}
            </section>

            {ultimo && (
              <section className={styles.reviewPanel}>
                <div className={styles.panelHeading}>
                  <div>
                    <h2>Temas a reforzar</h2>
                    <p>Según tu último intento ({formatearFecha(ultimo.fecha)}).</p>
                  </div>
                </div>
                <TemasAReforzar temas={ultimo.temasAReforzar} />
              </section>
            )}

            <section className={styles.reviewPanel}>
              <div className={styles.panelHeading}>
                <div><h2>Intentos</h2><p>Cada vez que lo resolviste.</p></div>
                <span className={styles.countBadge}>{intentos.length}</span>
              </div>
              {intentos.length ? (
                <div className={styles.reviewList}>
                  {intentos.map((intento) => (
                    <article className={styles.reviewItem} key={intento.idIntento}>
                      <span className={styles.reviewIcon}><ClipboardList size={19} /></span>
                      <div className={styles.reviewText}>
                        <strong>{porcentaje(intento.correctas, intento.total)}% · {intento.correctas} de {intento.total} bien</strong>
                        <small>{formatearFecha(intento.fecha)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>Todavía no lo resolviste.</p>
              )}
            </section>
          </>
        )}
      </section>
    </PlantillaLayout>
  );
}
