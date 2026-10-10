export interface Usuario {
    id: number;

    nombre:string;
    apellido:string;
    apodo:string;

    email:string;
    fechaNacimiento:Date;

    passwordHash:string;
    emailVerificado:boolean;

    embeddingFacial?: string | null;

    fechaCreacion: Date;
}