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
};