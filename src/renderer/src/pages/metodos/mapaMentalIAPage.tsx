import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { CartelError } from '../../components/comunes/cartelError';
import { MapaMentalDibujo } from '../../components/ia/mapaMentalDibujo';
import { EditorMapaMental } from '../../components/ia/editorMapaMental';
import { usarAvisos } from '../../hooks/usarAvisos';
import { nombreProveedorIA, type MapaMental, type MaterialIA } from '../../types/ia';
import { formatearFecha, mensajeError } from './utilidadesMetodosIA';
import styles from '../../styles/metodos.module.css';
import '../../styles/metodosIA.css';

// Un mapa mental guardado, dibujado con nodos y líneas. Con "Editar" se le cambian, agregan o quitan ideas.
export function MapaMentalIAPage() {
  const idMaterialIA = Number(useParams().id);
  const [material, setMaterial] = useState<MaterialIA | null>(null);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const { exito } = usarAvisos();

  async function guardar(contenido: MapaMental) {
    try {
      setMaterial(await window.api.editarMapaMental({ idMaterialIA, contenido }));
      setEditando(false);
      exito('Se guardaron los cambios del mapa.');
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron guardar los cambios.'));
    }
  }

  useEffect(() => {
    window.api.obtenerMaterialIA({ idMaterialIA })
      .then(setMaterial)
      .catch((e) => setError(mensajeError(e, 'No se pudo abrir el mapa mental.')));
  }, [idMaterialIA]);

  return (
    <PlantillaLayout titulo="Mapas Mentales" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={`${styles.page} metodos-ia__pagina-mapa`}>
        <Link className={styles.backLink} to="/mapas-mentales"><ArrowLeft size={17} /> Mapas mentales</Link>
        {error && <CartelError mensaje={error} onCerrar={() => setError('')} />}
        {!material && !error && <p className={styles.emptyText} role="status">Cargando…</p>}

        {material && (
          <section className={`${styles.reviewPanel} metodos-ia__panel-mapa`}>
            <header className="metodos-ia__encabezado metodos-ia__encabezado--con-accion">
              <h2>{material.titulo}</h2>
              {!editando && (
                <button type="button" className="metodos-ia__editar" onClick={() => setEditando(true)}>
                  <Pencil size={15} /> Editar
                </button>
              )}
              <p>
                {material.nombreArchivo && <>De: {material.nombreArchivo} · </>}
                {formatearFecha(material.fechaCreacion)}
                {material.proveedores.length > 0 && <> · Hecho con {material.proveedores.map(nombreProveedorIA).join(', ')}</>}
              </p>
            </header>
            {editando ? (
              <EditorMapaMental
                mapa={material.contenido as MapaMental}
                onGuardar={guardar}
                onSalir={() => setEditando(false)}
              />
            ) : (
              <MapaMentalDibujo mapa={material.contenido as MapaMental} />
            )}
          </section>
        )}
      </section>
    </PlantillaLayout>
  );
}
