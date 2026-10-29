import { Pencil, Sparkles } from 'lucide-react';
import { TextoConFormulas } from '../comunes/textoConFormulas';
import type { Flashcard } from '../../types/flashcards';
import styles from '../../styles/flashcards.module.css';

interface TarjetaFlashcardProps {
  tarjeta: Flashcard;
  // Está cargada en el formulario de arriba para editarla.
  editando: boolean;
  seleccionada: boolean;
  onEditar: () => void;
  onAlternarSeleccion: () => void;
}

// Una flashcard de la lista del mazo. El lápiz de la derecha la carga en el formulario para editarla.
export function TarjetaFlashcard({ tarjeta, editando, seleccionada, onEditar, onAlternarSeleccion }: TarjetaFlashcardProps) {
  return (
    <article className={`${styles.questionCard} ${editando ? styles.questionCardEditing : ''}`}>
      <input
        className={styles.itemCheckbox}
        type="checkbox"
        checked={seleccionada}
        onChange={onAlternarSeleccion}
        aria-label={`Seleccionar flashcard: ${tarjeta.pregunta}`}
      />
      <span className={styles.questionIcon}><Sparkles size={18} /></span>
      <div className={styles.questionText}>
        <strong><TextoConFormulas texto={tarjeta.pregunta} /></strong>
        <p><TextoConFormulas texto={tarjeta.respuesta} /></p>
      </div>
      <button
        type="button"
        className={styles.editButton}
        onClick={onEditar}
        aria-label={`Editar la flashcard: ${tarjeta.pregunta}`}
        aria-pressed={editando}
        title="Editar"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
    </article>
  );
}
