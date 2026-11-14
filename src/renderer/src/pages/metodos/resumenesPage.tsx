// src/renderer/src/pages/metodos/resumenesPage.tsx
// Método de estudio "Resúmenes", igual que las guías de preguntas: lista los resúmenes guardados
// (.docx en Material › "Resúmenes"), permite abrirlos/editarlos, eliminarlos y generar uno nuevo con IA.
// Los resúmenes de antes (guardados en la base, sin documento) se siguen viendo abajo.
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, ScrollText, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalResumenIA } from '../../components/materialIA/modalResumenIA';
import { VisorArchivo } from '../../components/visor/visorArchivo';
import { usarArchivosMaterial } from '../../hooks/usarArchivosMaterial';
import { usarAvisos } from '../../hooks/usarAvisos';
import type { Archivo } from '../../types/nodo';
import type { MaterialIA } from '../../types/ia';
import { formatearFecha, mensajeError } from './utilidadesMetodosIA';
import styles from '../../styles/flashcards.module.css';

// Tienen que coincidir con guardarResumenIA.ts.
const NOMBRE_CARPETA_RESUMENES = 'Resúmenes';
const ID_RAIZ_MATERIAL = 1;

const estiloBotonTexto = {
  background: 'none',
  border: 0,
  textAlign: 'left',
  cursor: 'pointer',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
} as const;

export function ResumenesPage() {
  const { confirmar, exito } = usarAvisos();
  const [resumenes, setResumenes] = useState<Archivo[]>([]);
  const [anteriores, setAnteriores] = useState<MaterialIA[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [abierto, setAbierto] = useState<Archivo | null>(null);
  const { archivos, cargando: cargandoArchivos } = usarArchivosMaterial(modalAbierto);

  const cargar = useCallback(async () => {
    try {
      setError('');
      const [raiz, viejos] = await Promise.all([
        window.api.listarContenido({ idPadre: ID_RAIZ_MATERIAL, ordenarPor: 'nombre', direccion: 'ASC' }),
        window.api.listarMaterialesIA({ tipo: 'resumen' }).catch(() => [] as MaterialIA[]),
      ]);
      setAnteriores(viejos);
      const carpeta = raiz.find((n) => n.tipo === 'carpeta' && n.nombre === NOMBRE_CARPETA_RESUMENES);
      if (!carpeta) {
        setResumenes([]);
        return;
      }
      const contenido = await window.api.listarContenido({ idPadre: carpeta.id, ordenarPor: 'nombre', direccion: 'ASC' });
      setResumenes(contenido.filter((n): n is Archivo => n.tipo === 'archivo'));
    } catch (e) {
      setError(mensajeError(e, 'No se pudieron cargar los resúmenes.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function eliminar(resumen: Archivo) {
    const ok = await confirmar(`¿Eliminar el resumen "${resumen.nombre}"? Esta acción no se puede deshacer.`, {
      titulo: 'Confirmar eliminación',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await window.api.eliminarArchivo({ id: resumen.id });
      exito('Se eliminó el resumen.');
      await cargar();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo eliminar el resumen.'));
    }
  }

  async function eliminarAnterior(resumen: MaterialIA) {
    const ok = await confirmar(`¿Eliminar el resumen "${resumen.titulo}"? Esta acción no se puede deshacer.`, {
      titulo: 'Confirmar eliminación',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await window.api.eliminarMaterialIA({ idMaterialIA: resumen.idMaterialIA });
      exito('Se eliminó el resumen.');
      await cargar();
    } catch (e) {
      setError(mensajeError(e, 'No se pudo eliminar el resumen.'));
    }
  }

  return (
    <PlantillaLayout titulo="Resúmenes" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <div className={styles.page}>
        <Link className={styles.backLink} to="/metodos"><ArrowLeft size={17} /> Métodos de estudio</Link>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>MÉTODOS DE ESTUDIO</p>
            <h2 className={styles.heading}>Tus resúmenes</h2>
            <p className={styles.description}>
              Generalos con IA a partir de tu material, editalos y repasá con ellos. También los encontrás en Material.
            </p>
          </div>
          <Button onClick={() => setModalAbierto(true)}><Sparkles size={17} /> Generar resumen</Button>
        </header>

        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={cargar} />}

        {cargando ? (
          <p className={styles.notice} role="status">Cargando tus resúmenes…</p>
        ) : resumenes.length || anteriores.length ? (
          <>
            {resumenes.length > 0 && (
              <div className={styles.deckGrid}>
                {resumenes.map((resumen) => (
                  <article className={styles.deckCard} key={resumen.id}>
                    <span className={styles.deckIcon}><ScrollText size={22} /></span>
                    <button
                      type="button"
                      className={styles.deckCardText}
                      style={estiloBotonTexto}
                      onClick={() => setAbierto(resumen)}
                      aria-label={`Abrir el resumen ${resumen.nombre}`}
                    >
                      <strong>{resumen.nombre}</strong>
                      <span>Documento Word</span>
                    </button>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => void eliminar(resumen)}
                      aria-label={`Eliminar el resumen ${resumen.nombre}`}
                      title="Eliminar resumen"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                    <ChevronRight className={styles.chevron} size={20} aria-hidden="true" />
                  </article>
                ))}
              </div>
            )}

            {anteriores.length > 0 && (
              <>
                <h3 className={styles.heading} style={{ fontSize: '1.1rem', marginTop: 8 }}>Resúmenes anteriores</h3>
                <div className={styles.deckGrid}>
                  {anteriores.map((resumen) => (
                    <article className={styles.deckCard} key={`anterior-${resumen.idMaterialIA}`}>
                      <span className={styles.deckIcon}><ScrollText size={22} /></span>
                      <Link
                        className={styles.deckCardText}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        to={`/resumenes/${resumen.idMaterialIA}`}
                        aria-label={`Abrir el resumen ${resumen.titulo}`}
                      >
                        <strong>{resumen.titulo}</strong>
                        <span>{resumen.nombreArchivo ? `De: ${resumen.nombreArchivo} · ` : ''}{formatearFecha(resumen.fechaCreacion)}</span>
                      </Link>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => void eliminarAnterior(resumen)}
                        aria-label={`Eliminar el resumen ${resumen.titulo}`}
                        title="Eliminar resumen"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                      <ChevronRight className={styles.chevron} size={20} aria-hidden="true" />
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><ScrollText size={25} /></span>
            <h3>Todavía no tenés resúmenes</h3>
            <p>Elegí material y generá tu primer resumen con IA.</p>
            <Button onClick={() => setModalAbierto(true)}>Generar mi primer resumen</Button>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ModalResumenIA
          archivos={archivos}
          cargandoArchivos={cargandoArchivos}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={() => void cargar()}
        />
      )}

      {abierto && (
        <VisorArchivo archivo={abierto} soloLectura={false} onCerrar={() => setAbierto(null)} onGuardado={() => void cargar()} />
      )}
    </PlantillaLayout>
  );
}
