import { useState } from 'react';
import { BookOpen, Brain, ChevronRight, ClipboardList, LayoutGrid, List, Maximize2, RotateCcw, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';
import styles from '../../styles/metodos.module.css';

type Vista = 'adaptable' | 'cuadricula' | 'lista';

const VISTAS: { valor: Vista; etiqueta: string; icono: LucideIcon }[] = [
  { valor: 'adaptable', etiqueta: 'Ajustar a la pantalla', icono: Maximize2 },
  { valor: 'cuadricula', etiqueta: 'Cuadrícula', icono: LayoutGrid },
  { valor: 'lista', etiqueta: 'Lista', icono: List },
];

const CLAVE_VISTA = 'syntra:metodos-vista';

function leerVista(): Vista {
  try {
    const valor = localStorage.getItem(CLAVE_VISTA);
    return VISTAS.some((v) => v.valor === valor) ? (valor as Vista) : 'adaptable';
  } catch {
    return 'adaptable';
  }
}

export function MetodosPage() {
  const [vista, setVista] = useState(leerVista);
  const metodos = [
    { nombre: 'Flashcards', detalle: 'Aprendé con tarjetas de pregunta y respuesta.', icono: BookOpen, ruta: '/flashcards', color: 'indigo' },
    { nombre: 'Repetición Espaciada', detalle: 'Repasá cada tema en el momento indicado.', icono: RotateCcw, ruta: '/repeticion-espaciada', color: 'blue' },
    { nombre: 'Cuestionarios', detalle: 'Poné a prueba lo que ya aprendiste.', icono: ClipboardList, ruta: '/proximamente/cuestionarios', color: 'lavender' },
    { nombre: 'Mapas Mentales', detalle: 'Conectá ideas y organizá conceptos.', icono: Brain, ruta: '/proximamente/mapas-mentales', color: 'slate' },
  ] as const;

  function cambiarVista(valor: Vista): void {
    setVista(valor);
    try {
      localStorage.setItem(CLAVE_VISTA, valor);
    } catch {
      // Si no se puede guardar, igual se aplica ahora
    }
  }

  const claseGrilla = {
    adaptable: styles.methodGrid,
    cuadricula: `${styles.methodGrid} ${styles.methodGridTwo}`,
    lista: `${styles.methodGrid} ${styles.methodList}`,
  }[vista];

  return (
    <PlantillaLayout titulo="Métodos de Estudio" idActivo="metodos" usuario={{ nombre: 'Usuario' }}>
      <section className={styles.page}>
        <div className={styles.introRow}>
          <p className={styles.intro}>Elegí una herramienta para organizar tu aprendizaje y avanzar a tu ritmo.</p>
          <div className={styles.viewToggle} role="radiogroup" aria-label="Cómo mostrar los métodos">
            {VISTAS.map(({ valor, etiqueta, icono: Icono }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={vista === valor}
                aria-label={etiqueta}
                title={etiqueta}
                className={vista === valor ? styles.viewActive : ''}
                onClick={() => cambiarVista(valor)}
              >
                <Icono size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div className={claseGrilla}>
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