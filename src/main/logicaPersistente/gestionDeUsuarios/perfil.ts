export interface Perfil {
    id: number;
    nombre: string;
    apellido: string;
    apodo: string;
    email: string;
    tieneRostro: boolean;
}

export function materializarPerfil(fila: any): Perfil {
    return {
        id: fila.id_usuario,
        nombre: fila.nombre,
        apellido: fila.apellido,
        apodo: fila.apodo,
        email: fila.email,
        tieneRostro: fila.tiene_rostro,
    };
}

export const COLUMNAS_PERFIL = `
    id_usuario, nombre, apellido, apodo, email,
    embedding_facial IS NOT NULL AS tiene_rostro
`;