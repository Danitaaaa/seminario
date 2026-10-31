import type { RolMiembro } from './types/proyectos';

// Contrato de nombres: solo las claves, sin roles. Los roles vienen de la API.
const ACCIONES = [
  'tarea.listar', 'tarea.crear', 'tarea.editar', 'tarea.alternar',
  'tarea.asignar', 'tarea.repartir', 'tarea.eliminar',
  'archivo.ver', 'archivo.subir', 'archivo.renombrar', 'archivo.mover',
  'archivo.eliminar', 'archivo.editarContenido', 'conflictos.listar', 
  'conflictos.resolver', 'carpeta.crear', 'carpeta.renombrar', 'carpeta.mover', 'carpeta.eliminar',
  'evento.crear', 'evento.editar', 'evento.eliminar',
  'meta.crear', 'meta.editar', 'meta.listar','meta.alternar', 'meta.eliminar',
  'meta.copiar', 'miembro.invitar', 'miembro.cambiarRol', 'miembro.cancelarInvitacion',
  'miembro.quitar', 'miembro.listar', 'proyecto.listarInvitaciones','proyecto.modificar', 
  'proyecto.eliminar', 'proyecto.obtener', 'proyecto.sincronizar'
] as const;

export type Accion = (typeof ACCIONES)[number];

let reglas: Partial<Record<Accion, readonly RolMiembro[]>> = {};
let version = 0;
const oyentes = new Set<() => void>();

export const suscribirReglas = (fn: () => void) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};
export const versionReglas = () => version;

export async function cargarReglas(): Promise<void> {
  const remotas: Record<string, readonly RolMiembro[]> =
    await window.api.obtenerReglas();
    console.log('Reglas cargadas');
  if (import.meta.env.DEV) {
    const claves = Object.keys(remotas);
    console.log(claves);
    const faltan = ACCIONES.filter((a) => !claves.includes(a));
    const sobran = claves.filter((c) => !(ACCIONES as readonly string[]).includes(c));
    if (faltan.length) console.warn('[permisos] el back no define:', faltan);
    if (sobran.length) console.warn('[permisos] el front no conoce:', sobran);
  }

  reglas = remotas;
  version++;
  oyentes.forEach((fn) => fn());
}

/** rol null/undefined = no es miembro activo: no puede nada. */
export function puede(rol: RolMiembro | null | undefined, accion: Accion): boolean {
  console.log(reglas[accion]);
  return !!rol && (reglas[accion]?.includes(rol) ?? false);
}

export function rolDe(
  miembros: { idUsuario: number | null; rol: RolMiembro; activo: boolean }[],
  idUsuario: number,
): RolMiembro | null {
  return miembros.find((m) => m.idUsuario === idUsuario && m.activo)?.rol ?? null;
}