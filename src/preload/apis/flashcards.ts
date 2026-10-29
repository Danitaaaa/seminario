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

  modificarDeck: (datos: unknown) =>
    ipcRenderer.invoke(
      "flashcards:modificarDeck",
      datos
    ),

  eliminarDecks: (datos: { usuarioId: number; deckIds: number[] }) =>
    ipcRenderer.invoke(
      "flashcards:eliminarDecks",
      datos
    ),

  eliminarFlashcards: (datos: { usuarioId: number; flashcardIds: number[] }) =>
    ipcRenderer.invoke(
      "flashcards:eliminarFlashcards",
      datos
    ),
};