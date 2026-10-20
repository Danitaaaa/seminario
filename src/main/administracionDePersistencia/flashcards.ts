import { CrearDeck } from "../logicaPersistente/gestionDeFlashcards/crearDeck";
import { ListarDecks } from "../logicaPersistente/gestionDeFlashcards/listarDecks";
import { CrearDeckDTO } from "../logicaPersistente/gestionDeFlashcards/dto";

export class Flashcards {

    constructor(
        private readonly crearDeckCasoUso: CrearDeck,
        private readonly listarDecksCasoUso: ListarDecks
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
}