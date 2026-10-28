export type Prioridad = 'alta' | 'media' | 'baja';

export interface Tarea {
    idTarea: number;
    idGlobal: string;
    idProyecto: number | null; // null = tarea personal
    titulo: string;
    descripcion: string | null;
    prioridad: Prioridad;
    fechaLimite: string | null; // AAAA-MM-DD
    fechaInicio: string | null; // AAAA-MM-DD
    idAsignado: number | null;
    completada: boolean;
    fechaCompletada: Date | null;
    completadaPor: number | null;
    orden: number;
    creadaPor: number;
    fechaCreacion: Date;
}