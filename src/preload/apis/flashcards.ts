import { ipcRenderer } from "electron";

export const flashcardsApi = {

  crearDeck: (datos: unknown) =>
    ipcRenderer.invoke(
      "flashcards:crearDeck",
      datos
    ),

  listarDecks: (usuarioId: number) =>
    ipcRenderer.invoke(
      "flashcards:listarDecks",
      usuarioId
    ),

  crearFlashcard: (datos: unknown) =>
    ipcRenderer.invoke(
      "flashcards:crearFlashcard",
      datos
    ),

  listarFlashcards: (datos: { usuarioId: number; deckId: number }) =>
    ipcRenderer.invoke(
      "flashcards:listarFlashcards",
      datos
    ),

  modificarFlashcard: (datos: unknown) =>
    ipcRenderer.invoke(
      "flashcards:modificarFlashcard",
      datos
    ),
};