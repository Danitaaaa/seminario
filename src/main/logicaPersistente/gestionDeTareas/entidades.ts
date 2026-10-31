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
    idAsignadoGlobal: string | null;     // uid global del usuario; null = sin asignar
    completada: boolean;
    fechaCompletada: Date | null;
    completadaPorGlobal: string | null;  // uid global
    orden: number;
    creadaPorGlobal: string;             // uid global
    fechaCreacion: Date;
}