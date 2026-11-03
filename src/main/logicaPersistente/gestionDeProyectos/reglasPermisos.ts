import type { RolMiembro } from './entidades';

const TODOS: RolMiembro[] = ['propietario', 'editor', 'lector'];
const EDITOR: RolMiembro[] = ['propietario', 'editor'];
const PROPIETARIO: RolMiembro[] = ['propietario'];

export const REGLAS = {
    // Tareas
    'tarea.listar': TODOS, // Verificado
    'tarea.crear': EDITOR, // Verificado
    'tarea.editar': EDITOR, // Verificado
    'tarea.alternar': TODOS, // Verificado
    'tarea.asignar': EDITOR, // Verificado
    'tarea.repartir': EDITOR, // Verificado
    'tarea.eliminar': EDITOR, // Verificado

    // Material del proyecto
    'archivo.ver': TODOS, // Verificado
    'archivo.subir': EDITOR, // Verificado
    'archivo.renombrar': EDITOR, // Verificado
    'archivo.mover': EDITOR, // Verificado
    'archivo.eliminar': EDITOR, // Verificado
    'archivo.editarContenido': EDITOR, // Verificado
    'conflictos.listar': TODOS, // Verificado
    'conflictos.resolver': EDITOR, // Verificado
    'carpeta.crear': EDITOR, // Verificado
    'carpeta.renombrar': EDITOR, // Verificado 
    'carpeta.mover': EDITOR, // Verificado
    'carpeta.eliminar': EDITOR, // Verificado

    // Eventos 
    'evento.crear': EDITOR, // Verificado
    'evento.editar': EDITOR, // Verificado
    'evento.eliminar': EDITOR, // Verificado

    // Metas
    'meta.crear': EDITOR, // Verificado
    'meta.editar': EDITOR, // Verificado
    'meta.listar': TODOS, // Verificado
    'meta.alternar': EDITOR, // Verificado
    'meta.eliminar': EDITOR, // Verificado
    'meta.copiar': EDITOR, // Verificado

    // Proyecto y miembros
    'miembro.invitar': EDITOR, // Verificado
    'miembro.cambiarRol': EDITOR, // Verificado
    'miembro.cancelarInvitacion': EDITOR, // Verificado
    'miembro.quitar': EDITOR, // Verificado
    'miembro.listar': TODOS, // Verificado
    'proyecto.listarInvitaciones': TODOS, // Verificado
    'proyecto.modificar': EDITOR, // Verificado
    'proyecto.eliminar': PROPIETARIO, // Verificado
    'proyecto.obtener': TODOS, // Verificado
    'proyecto.sincronizar': TODOS, // Verificado
} as const satisfies Record<string, readonly RolMiembro[]>;

export type Accion = keyof typeof REGLAS;
export type ReglasPermisos = Record<Accion, readonly RolMiembro[]>;