// src/renderer/src/components/materialIA/modalGenerando.tsx
// Paso "generando" de los modales de IA (flashcards, guía de preguntas): la animación y el botón de cancelar.
// Está en un solo lugar para que todos los modales se vean igual.
import { Button } from '../ui/button/button';
import { IndicadorIA } from './indicadorIA';
import styles from '../../styles/flashcards.module.css';

interface Props {
  /** Qué se está generando, por ejemplo "Generando flashcards". */
  mensaje: string;
  /** Texto chico debajo (avance por archivo, aviso de demora…). */
  detalle?: string;
  onCancelar: () => void;
  /** Texto del botón; por defecto "Cancelar generación". */
  textoCancelar?: string;
}

export function ModalGenerando({ mensaje, detalle, onCancelar, textoCancelar = 'Cancelar generación' }: Props) {
  return (
    <>
      <IndicadorIA mensaje={mensaje} detalle={detalle} />
      <div className={styles.modalActions}>
        <Button variant="secondary" onClick={onCancelar}>{textoCancelar}</Button>
      </div>
    </>
  );
}