import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Brain, ClipboardList, FileText, Sparkles, Trash2, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalAbrirMaterial } from '../../components/sesionEstudio/modalAbrirMaterial';
import { GenerarConIA } from '../../components/ia/generarConIA';
import { usarAvisos } from '../../hooks/usarAvisos';
import type { Archivo } from '../../types/nodo';
import { RUTA_TIPO_IA, esFuenteIA, type MaterialIA, type TipoMaterialIA } from '../../types/ia';
import { formatearFecha, mensajeError } from './utilidadesMetodosIA';
import styles from '../../styles/metodos.module.css';
import '../../styles/metodosIA.css';

const TEXTOS: Record<TipoMaterialIA, { titulo: string; detalle: string; vacio: string; icono: LucideIcon; singular: string }> = {
  resumen: {
    titulo: 'Resúmenes',
    detalle: 'Resúmenes de estudio generados a partir de tu material.',
    vacio: 'Todavía no generaste resúmenes.',
    icono: FileText,
    singular: 'resumen',
  },
  cuestionario: {
    titulo: 'Cuestionarios',
    detalle: 'Poné a prueba lo que ya aprendiste. Al terminar ves la corrección y qué temas reforzar.',
    vacio: 'Todavía no generaste cuestionarios.',
    icono: ClipboardList,
    singular: 'cuestionario',
  },
  mapaMental: {
    titulo: 'Mapas Mentales',
    detalle: 'Conectá ideas y organizá conceptos.',
    vacio: 'Todavía no generaste mapas mentales.',
    icono: Brain,
    singular: 'mapa mental',
  },
};

// Lista del material de un tipo generado con IA: abrir, eliminar y generar uno nuevo desde Material.
export function MaterialesIAPage({ tipo }: { tipo: TipoMaterialIA }) {
  const navigate = useNavigate();
  const { confirmar } = usarAvisos();
  const textos = TEXTOS[tipo];
  const Icono = textos.icono;
  const [lista, setLista] = useState<MaterialIA[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eligiendo, setEligiendo] = useState(false);
  const [archivo, setArchivo] = useState<Archivo | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError('');
      setLista(await window.api.listarMaterialesIA({ tipo }));
    } catch (e) {
      setError(mensajeError(e, `No se pudieron cargar los ${textos.titulo.toLowerCase()}.`));
    } finally {
      setCargando(false);
    }
  }, [tipo, textos.titulo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function elegirArchivo(elegido: Archivo) {
    if (!esFuenteIA(elegido.extension)) {
      setError('Elegí un archivo PDF o Word (DOCX): son los que la IA puede leer.');
      return;
    }
    setEligiendo(false);
    setArchivo(elegido);
  }

  async function eliminar(material: MaterialIA) {
    const ok = await confirmar(`¿Eliminar "${material.titulo}"?`, {
      titulo: 'Confirmar eliminación',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await window.api.eliminarMaterialIA({ idMaterialIA: material.idMaterialIA });
      setLista((actual) => actual.filter((m) => m.idMaterialIA !== material.idMaterialIA));
    } catch (e) {
      setError(mensajeError(e, 'No se pudo eliminar.'));
    }
  }

  return (
    <PlantillaLayout titulo={textos.titulo} idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <Link className={styles.backLink} to="/metodos"><ArrowLeft size={17} /> Métodos de estudio</Link>

        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={() => void cargar()} />}

        <section className={styles.reviewPanel}>
          <div className={styles.panelHeading}>
            <div><h2>{textos.titulo}</h2><p>{textos.detalle}</p></div>
            <Button onClick={() => setEligiendo(true)}>
              <span className="metodos-ia__boton-icono"><Sparkles size={16} /> Generar desde Material</span>
            </Button>
          </div>

          {cargando ? (
            <p className={styles.emptyText} role="status">Cargando…</p>
          ) : lista.length ? (
            <div className={styles.reviewList}>
              {lista.map((material) => (
                <article className={styles.reviewItem} key={material.idMaterialIA}>
                  <span className={styles.reviewIcon}><Icono size={19} /></span>
                  <div className={styles.reviewText}>
                    <strong>{material.titulo}</strong>
                    <span>{material.nombreArchivo ? `De: ${material.nombreArchivo}` : 'El archivo original ya no está en Material'}</span>
                    <small>{formatearFecha(material.fechaCreacion)}</small>
                  </div>
                  <div className="metodos-ia__acciones">
                    <Button variant="secondary" onClick={() => navigate(`${RUTA_TIPO_IA[tipo]}/${material.idMaterialIA}`)}>Abrir</Button>
                    <button
                      type="button"
                      className="metodos-ia__eliminar"
                      aria-label={`Eliminar ${material.titulo}`}
                      title="Eliminar"
                      onClick={() => void eliminar(material)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              {textos.vacio} Tocá <strong>Generar desde Material</strong> y elegí un PDF o Word, o abrilo en Material y
              usá <strong>Generar con IA</strong>.
            </p>
          )}
        </section>
      </section>

      {eligiendo && <ModalAbrirMaterial onElegir={elegirArchivo} onCerrar={() => setEligiendo(false)} />}
      {archivo && (
        <GenerarConIA
          archivo={archivo}
          tipoFijo={tipo}
          onCerrar={() => {
            setArchivo(null);
            void cargar();
          }}
        />
      )}
    </PlantillaLayout>
  );
}
