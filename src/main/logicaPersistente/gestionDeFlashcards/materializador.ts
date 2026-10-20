import { Deck } from "./entidades";

export function materializarDeck(
    fila: any
): Deck {

    return {
        idDeck: fila.id_deck,
        usuarioId: fila.id_usuario,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        materiaAsociada: fila.materia_asociada,
        fechaCreacion: fila.fecha_creacion,
    };
}

export function desmaterializarDeck(
    deck: Deck
): Record<string, unknown> {

    return {

        id_deck: deck.idDeck,
        id_usuario: deck.usuarioId,
        nombre: deck.nombre,
        descripcion: deck.descripcion,
        materia_asociada: deck.materiaAsociada,
        fecha_creacion: deck.fechaCreacion,
    };
}