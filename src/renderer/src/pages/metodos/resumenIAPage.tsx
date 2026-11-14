import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { nombreProveedorIA, type MaterialIA, type Resumen } from '../../types/ia';
import { formatearFecha, mensajeError } from './utilidadesMetodosIA';
import styles from '../../styles/metodos.module.css';
import '../../styles/metodosIA.css';

// Un resumen guardado: título, ideas clave y secciones.
export function ResumenIAPage() {
  const idMaterialIA = Number(useParams().id);
  const [material, setMaterial] = useState<MaterialIA | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.obtenerMaterialIA({ idMaterialIA })
      .then(setMaterial)
      .catch((e) => setError(mensajeError(e, 'No se pudo abrir el resumen.')));
  }, [idMaterialIA]);

  const resumen = material?.contenido as Resumen | undefined;

  return (
    <PlantillaLayout titulo="Resúmenes" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <Link className={styles.backLink} to="/resumenes"><ArrowLeft size={17} /> Resúmenes</Link>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}
        {!material && !error && <p className={styles.emptyText} role="status">Cargando…</p>}

        {material && resumen && (
          <article className={`${styles.reviewPanel} metodos-ia__documento`}>
            <header className="metodos-ia__encabezado">
              <h2>{resumen.titulo}</h2>
              <p>
                {material.nombreArchivo && <>De: {material.nombreArchivo} · </>}
                {formatearFecha(material.fechaCreacion)}
                {material.proveedores.length > 0 && <> · Hecho con {material.proveedores.map(nombreProveedorIA).join(', ')}</>}
              </p>
            </header>

            <section className="metodos-ia__ideas">
              <h3>Ideas clave</h3>
              <ul>
                {resumen.ideasClave.map((idea, i) => <li key={i}>{idea}</li>)}
              </ul>
            </section>

            {resumen.secciones.map((seccion, i) => (
              <section className="metodos-ia__seccion" key={i}>
                <h3>{seccion.titulo}</h3>
                {seccion.contenido.split(/\n{2,}/).map((parrafo, j) => <p key={j}>{parrafo}</p>)}
              </section>
            ))}
          </article>
        )}
      </section>
    </PlantillaLayout>
  );
}
