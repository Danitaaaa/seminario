import { CrearDeck } from "../logicaPersistente/gestionDeFlashcards/crearDeck";
import { ListarDecks } from "../logicaPersistente/gestionDeFlashcards/listarDecks";
import { CrearFlashcard } from "../logicaPersistente/gestionDeFlashcards/crearFlashcard";
import { ListarFlashcards } from "../logicaPersistente/gestionDeFlashcards/listarFlashcards";
import { ModificarFlashcard } from "../logicaPersistente/gestionDeFlashcards/modificarFlashcard";
import { ModificarDeck } from "../logicaPersistente/gestionDeFlashcards/modificarDeck";
import { EliminarDecks } from "../logicaPersistente/gestionDeFlashcards/eliminarDecks";
import { EliminarFlashcards } from "../logicaPersistente/gestionDeFlashcards/eliminarFlashcards";
import {
    CrearDeckDTO,
    CrearFlashcardDTO,
    EliminarDecksDTO,
    EliminarFlashcardsDTO,
    ModificarDeckDTO,
    ModificarFlashcardDTO
} from "../logicaPersistente/gestionDeFlashcards/dto";

export class Flashcards {

    constructor(
        private readonly crearDeckCasoUso: CrearDeck,
        private readonly listarDecksCasoUso: ListarDecks,
        private readonly crearFlashcardCasoUso: CrearFlashcard,
        private readonly listarFlashcardsCasoUso: ListarFlashcards,
        private readonly modificarFlashcardCasoUso: ModificarFlashcard,
        private readonly modificarDeckCasoUso: ModificarDeck,
        private readonly eliminarDecksCasoUso: EliminarDecks,
        private readonly eliminarFlashcardsCasoUso: EliminarFlashcards
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

    async modificarFlashcard(datos: ModificarFlashcardDTO) {
        return this.modificarFlashcardCasoUso.ejecutar(datos);
    }

    async modificarDeck(datos: ModificarDeckDTO) {
        return this.modificarDeckCasoUso.ejecutar(datos);
    }

    async eliminarDecks(datos: EliminarDecksDTO) {
        return this.eliminarDecksCasoUso.ejecutar(datos);
    }

    async eliminarFlashcards(datos: EliminarFlashcardsDTO) {
        return this.eliminarFlashcardsCasoUso.ejecutar(datos);
    }
}