import { ipcMain } from "electron";
import { Flashcards } from "../administracionDePersistencia/flashcards";
import { crearDeckSchema } from "../logicaPersistente/gestionDeFlashcards/dto";

export function registerFlashcardsIpc(
    flashcards: Flashcards
): void {

    ipcMain.handle(
        "flashcards:crearDeck",
        async (_event, datos: unknown) => {

            const validado =
                crearDeckSchema.parse(
                    datos
                );

            return flashcards.crearDeck(
                validado
            );
        }
    );

    ipcMain.handle(
        "flashcards:listarDecks",
        async (_event, usuarioId: number) => {

            return flashcards.listarDecks(
                usuarioId
            );
        }
    );
}