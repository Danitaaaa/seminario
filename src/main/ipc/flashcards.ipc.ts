import { ipcMain } from "electron";
import { Flashcards } from "../administracionDePersistencia/flashcards";
import {
    crearDeckSchema,
    crearFlashcardSchema,
    eliminarDecksSchema,
    eliminarFlashcardsSchema,
    listarFlashcardsSchema,
    modificarDeckSchema,
    modificarFlashcardSchema
} from "../logicaPersistente/gestionDeFlashcards/dto";

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

    ipcMain.handle(
        "flashcards:crearFlashcard",
        async (_event, datos: unknown) =>
            flashcards.crearFlashcard(crearFlashcardSchema.parse(datos))
    );

    ipcMain.handle(
        "flashcards:listarFlashcards",
        async (_event, datos: unknown) => {
            const validado = listarFlashcardsSchema.parse(datos);
            return flashcards.listarFlashcards(validado.usuarioId, validado.deckId);
        }
    );

    ipcMain.handle(
        "flashcards:modificarFlashcard",
        async (_event, datos: unknown) =>
            flashcards.modificarFlashcard(modificarFlashcardSchema.parse(datos))
    );

    ipcMain.handle(
        "flashcards:modificarDeck",
        async (_event, datos: unknown) =>
            flashcards.modificarDeck(modificarDeckSchema.parse(datos))
    );

    ipcMain.handle(
        "flashcards:eliminarDecks",
        async (_event, datos: unknown) =>
            flashcards.eliminarDecks(eliminarDecksSchema.parse(datos))
    );

    ipcMain.handle(
        "flashcards:eliminarFlashcards",
        async (_event, datos: unknown) =>
            flashcards.eliminarFlashcards(eliminarFlashcardsSchema.parse(datos))
    );
}