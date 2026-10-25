import { BookOpen, Brain, ChevronRight, ClipboardList, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import styles from '../../styles/metodos.module.css';

export function MetodosPage() {
  const metodos = [
    { nombre: 'Flashcards', detalle: 'Aprendé con tarjetas de pregunta y respuesta.', icono: BookOpen, ruta: '/flashcards', color: 'indigo' },
    { nombre: 'Repetición Espaciada', detalle: 'Repasá cada tema en el momento indicado.', icono: RotateCcw, ruta: '/repeticion-espaciada', color: 'blue' },
    { nombre: 'Cuestionarios', detalle: 'Poné a prueba lo que ya aprendiste.', icono: ClipboardList, ruta: '/proximamente/cuestionarios', color: 'lavender' },
    { nombre: 'Mapas Mentales', detalle: 'Conectá ideas y organizá conceptos.', icono: Brain, ruta: '/proximamente/mapas-mentales', color: 'slate' },
  ] as const;

  return (
    <PlantillaLayout titulo="Métodos de Estudio" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <p className={styles.intro}>Elegí una herramienta para organizar tu aprendizaje y avanzar a tu ritmo.</p>
        <div className={styles.methodGrid}>
          {metodos.map(({ nombre, detalle, icono: Icono, ruta, color }) => (
            <Link className={styles.methodCard} to={ruta} key={nombre}>
              <span className={`${styles.methodIcon} ${styles[color]}`}><Icono size={25} /></span>
              <span className={styles.methodCopy}>
                <strong>{nombre}</strong>
                <span>{detalle}</span>
              </span>
              <ChevronRight className={styles.chevron} size={20} />
            </Link>
          ))}
        </div>
      </section>
    </PlantillaLayout>
  );
}
