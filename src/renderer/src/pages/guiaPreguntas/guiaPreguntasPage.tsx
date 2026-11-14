// src/renderer/src/pages/guiasPreguntas/guiasPreguntasPage.tsx
// Método de estudio "Guías de preguntas": lista las guías guardadas (.docx en Material › "guia"),
// permite abrirlas/editarlas, eliminarlas y generar una nueva con IA.
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import { Button } from '../../components/ui/button/button';
import { CartelError } from '../../components/comunes/cartelError';
import { ModalGuiaPreguntas } from '../../components/materialIA/modalGuiaPreguntas';
import { VisorArchivo } from '../../components/visor/visorArchivo';
import { usarArchivosMaterial } from '../../hooks/usarArchivosMaterial';
import { usarAvisos } from '../../hooks/usarAvisos';
import type { Archivo } from '../../types/nodo';
import styles from '../../styles/flashcards.module.css';

// Tienen que coincidir con guardarGuiaPreguntas.ts.
const NOMBRE_CARPETA_GUIAS = 'guia';
const ID_RAIZ_MATERIAL = 1;

export function GuiasPreguntasPage() {
  const { confirmar, exito } = usarAvisos();
  const [guias, setGuias] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [abierta, setAbierta] = useState<Archivo | null>(null);
  const { archivos, cargando: cargandoArchivos } = usarArchivosMaterial(modalAbierto);

  const cargar = useCallback(async () => {
    try {
      setError('');
      const raiz = await window.api.listarContenido({ idPadre: ID_RAIZ_MATERIAL, ordenarPor: 'nombre', direccion: 'ASC' });
      console.log('[guias] raiz', raiz); // TEMPORAL: borrar cuando funcione
      const carpeta = raiz.find((n) => n.tipo === 'carpeta' && n.nombre === NOMBRE_CARPETA_GUIAS);
      console.log('[guias] carpeta guia', carpeta); // TEMPORAL
      if (!carpeta) {
        setGuias([]);
        return;
      }
      const contenido = await window.api.listarContenido({ idPadre: carpeta.id, ordenarPor: 'nombre', direccion: 'ASC' });
      console.log('[guias] contenido guia', contenido); // TEMPORAL
      setGuias(contenido.filter((n): n is Archivo => n.tipo === 'archivo'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las guías.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function eliminar(guia: Archivo) {
    const ok = await confirmar(`¿Eliminar la guía "${guia.nombre}"? Esta acción no se puede deshacer.`, {
      titulo: 'Confirmar eliminación', textoConfirmar: 'Eliminar', peligro: true,
    });
    if (!ok) return;
    try {
      await window.api.eliminarArchivo({ id: guia.id });
      exito('Se eliminó la guía.');
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la guía.');
    }
  }

  return (
    <PlantillaLayout titulo="Guías de preguntas" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <div className={styles.page}>
        <Link className={styles.backLink} to="/metodos"><ArrowLeft size={17} /> Métodos de estudio</Link>
        <header className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>MÉTODOS DE ESTUDIO</p>
            <h2 className={styles.heading}>Tus guías de preguntas</h2>
            <p className={styles.description}>Generalas con IA a partir de tu material, editalas y repasá con ellas. También las encontrás en Material.</p>
          </div>
          <Button onClick={() => setModalAbierto(true)}><Sparkles size={17} /> Generar guía</Button>
        </header>

        {error && <CartelError mensaje={error} onCerrar={() => setError('')} onReintentar={cargar} />}

        {cargando ? <p className={styles.notice} role="status">Cargando tus guías…</p> : guias.length ? (
          <div className={styles.deckGrid}>
            {guias.map((guia) => (
              <article className={styles.deckCard} key={guia.id}>
                <span className={styles.deckIcon}><FileText size={22} /></span>
                <button
                  type="button"
                  className={styles.deckCardText}
                  style={{ background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
                  onClick={() => setAbierta(guia)}
                  aria-label={`Abrir la guía ${guia.nombre}`}
                >
                  <strong>{guia.nombre}</strong>
                  <span>Documento Word</span>
                </button>
                <button type="button" className={styles.editButton} onClick={() => void eliminar(guia)} aria-label={`Eliminar la guía ${guia.nombre}`} title="Eliminar guía">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
                <ChevronRight className={styles.chevron} size={20} aria-hidden="true" />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><FileText size={25} /></span>
            <h3>Todavía no tenés guías</h3>
            <p>Elegí material y generá tu primera guía de preguntas con IA.</p>
            <Button onClick={() => setModalAbierto(true)}>Generar mi primera guía</Button>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ModalGuiaPreguntas
          archivos={archivos}
          cargandoArchivos={cargandoArchivos}
          onCerrar={() => setModalAbierto(false)}
          onGuardada={() => void cargar()}
        />
      )}

      {abierta && (
        <VisorArchivo
          archivo={abierta}
          soloLectura={false}
          onCerrar={() => setAbierta(null)}
          onGuardado={() => void cargar()}
        />
      )}
    </PlantillaLayout>
  );
}