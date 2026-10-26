import { CrearDeck } from "../logicaPersistente/gestionDeFlashcards/crearDeck";
import { ListarDecks } from "../logicaPersistente/gestionDeFlashcards/listarDecks";
import { CrearDeckDTO } from "../logicaPersistente/gestionDeFlashcards/dto";
import { CrearFlashcard } from "../logicaPersistente/gestionDeFlashcards/crearFlashcard";
import { ListarFlashcards } from "../logicaPersistente/gestionDeFlashcards/listarFlashcards";
import { CrearFlashcardDTO } from "../logicaPersistente/gestionDeFlashcards/dto";

export class Flashcards {

    constructor(
        private readonly crearDeckCasoUso: CrearDeck,
        private readonly listarDecksCasoUso: ListarDecks,
        private readonly crearFlashcardCasoUso: CrearFlashcard,
        private readonly listarFlashcardsCasoUso: ListarFlashcards
    ) {}

    async crearDeck(
        datos: CrearDeckDTO
    ) {
        return this.crearDeckCasoUso.ejecutar(
            datos
        );
    }

    async listarDecks(
        usuarioId: number
    ) {
        return this.listarDecksCasoUso.ejecutar(
            usuarioId
        );
    }

    async crearFlashcard(datos: CrearFlashcardDTO) {
        return this.crearFlashcardCasoUso.ejecutar(datos);
    }

    async listarFlashcards(usuarioId: number, deckId: number) {
        return this.listarFlashcardsCasoUso.ejecutar(usuarioId, deckId);
    }
}