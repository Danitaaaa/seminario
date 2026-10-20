import { CrearDeck } from "./crearDeck";
import { ListarDecks } from "./listarDecks";
import { CrearDeckDTO } from "./dto";

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