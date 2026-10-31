export type Prioridad = 'alta' | 'media' | 'baja';

export interface Tarea {
    idTarea: number;
    idGlobal: string;
    idProyecto: number | null;      // null = tarea personal (sin proyecto)
    idUsuario: number | null;       // dueño: solo en tareas sin proyecto
    titulo: string;
    descripcion: string | null;
    prioridad: Prioridad;
    fechaLimite: string | null;     // AAAA-MM-DD
    fechaInicio: string | null;     // AAAA-MM-DD
    idAsignado: number | null;      // usuario local (proyecto personal)
    idAsignadoGlobal: string | null; // uid global (proyecto compartido)
    completada: boolean;
    fechaCompletada: Date | null;
    orden: number;
    fechaCreacion: Date;
}