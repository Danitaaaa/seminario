export interface Deck {
    idDeck: number;

    usuarioId: number;

    nombre: string;

    descripcion: string | null;

    materiaAsociada: string | null;

    fechaCreacion: Date;
}