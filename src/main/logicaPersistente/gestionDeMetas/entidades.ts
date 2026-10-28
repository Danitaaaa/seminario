export interface Meta {
    idMeta: number;
    idProyecto: number | null; // null = meta personal
    titulo: string;
    descripcion: string | null;
    mes: string; // AAAA-MM
    completada: boolean;
    fechaCompletada: Date | null;
    completadaPor: number | null;
    orden: number;
    creadaPor: number;
    trasladadaA: string | null;
    idMetaOrigen: number | null;
    fechaCreacion: Date;
}

export interface EstadisticaMes {
    mes: string; // AAAA-MM
    total: number;
    completadas: number;
    trasladadas: number;
}

export interface EstadisticaMiembro {
    idUsuario: number;
    completadas: number;
}

export interface EstadisticasMetas {
    porMes: EstadisticaMes[];
    porMiembro: EstadisticaMiembro[];
}