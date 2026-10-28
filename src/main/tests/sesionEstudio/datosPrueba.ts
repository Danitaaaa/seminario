import { vi } from 'vitest';

// Persistencia falsa: cada test le dice qué filas devolver en cada consulta.
export function crearPersistenciaFalsa() {
  return { ejecutar: vi.fn() };
}

// Error como los que devuelve Postgres (con su código).
export function errorPostgres(codigo: string): Error {
  return Object.assign(new Error(`error ${codigo}`), { code: codigo });
}

// Fila de sesion_estudio tal como la devuelve SELECT_SESION_ESTUDIO.
export function filaSesion(cambios: Record<string, unknown> = {}) {
  return {
    id_sesion_estudio: 1,
    id_usuario: 7,
    nombre: 'Repaso parcial',
    duracion: 60,
    id_materia: 3,
    materia_nombre: 'Base de datos',
    metodos_estudio: [{ idTipoMetodoEstudio: 1, nombre: 'Flashcards' }],
    estado: 'sin_empezar',
    fecha_creacion: '2026-10-20T12:00:00.000Z',
    fecha_programada: '2026-10-28T18:00:00.000Z',
    fecha_ultimo_acceso: '2026-10-20T12:00:00.000Z',
    fecha_inicio: null,
    fecha_fin: null,
    fecha_pausa: null,
    segundos_pausados: 0,
    pomodoro_min: 35,
    descanso_corto_min: 10,
    descanso_largo_min: 15,
    pomodoro_fase: 'pomodoro',
    pomodoro_restante_seg: null,
    pomodoro_corriendo_desde: null,
    pomodoros_completados: 0,
    recibir_notificacion: false,
    contenido: '<p>hola</p>',
    id_archivo: 10,
    metas: [],
    ...cambios,
  };
}