import { describe, it, expect, vi } from 'vitest';
import { ModificarFlashcard } from '../../logicaPersistente/gestionDeFlashcards/modificarFlashcard';
import { modificarFlashcardSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';

const fila = { id_flashcard: 4, id_deck: 2, pregunta: '¿Qué es $x^2$?', respuesta: 'Un cuadrado', fecha_creacion: new Date() };

describe('Flashcards: editar', () => {
  it('cambia pregunta y respuesta solo si el mazo es del usuario', async () => {
    const p = { ejecutar: vi.fn().mockResolvedValueOnce([fila]) } as any;
    const r = await new ModificarFlashcard(p).ejecutar({ usuarioId: 7, idFlashcard: 4, pregunta: '¿Qué es $x^2$?', respuesta: 'Un cuadrado' });
    const [sql, valores] = p.ejecutar.mock.calls[0];
    expect(sql).toMatch(/UPDATE flashcards/);
    expect(sql).toMatch(/d\.id_usuario = \$1/);
    expect(valores).toEqual([7, 4, '¿Qué es $x^2$?', 'Un cuadrado']);
    expect(r).toMatchObject({ idFlashcard: 4, deckId: 2, respuesta: 'Un cuadrado' });
  });

  it('avisa si la flashcard no existe o es de otro usuario', async () => {
    const p = { ejecutar: vi.fn().mockResolvedValueOnce([]) } as any;
    await expect(new ModificarFlashcard(p).ejecutar({ usuarioId: 9, idFlashcard: 4, pregunta: 'a', respuesta: 'b' }))
      .rejects.toThrow(/No se encontró la flashcard/);
  });

  it('valida los mismos largos que al crear', () => {
    const base = { usuarioId: 7, idFlashcard: 4 };
    expect(modificarFlashcardSchema.safeParse({ ...base, pregunta: '  hola ', respuesta: 'chau' }).data?.pregunta).toBe('hola');
    expect(modificarFlashcardSchema.safeParse({ ...base, pregunta: 'q'.repeat(251), respuesta: 'r' }).success).toBe(false);
    expect(modificarFlashcardSchema.safeParse({ ...base, pregunta: 'q', respuesta: 'r'.repeat(2001) }).success).toBe(false);
    expect(modificarFlashcardSchema.safeParse({ ...base, pregunta: '   ', respuesta: 'r' }).success).toBe(false);
  });
});
