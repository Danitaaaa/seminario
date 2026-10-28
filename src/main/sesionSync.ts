// Datos de sesión que necesita la sincronización. Viven solo en memoria: nunca se escriben a disco
// (la contraseña ya se guarda cifrada con safeStorage dentro de crearProveedorIdentidad).
let idUsuario: number | null = null;
let password: string | null = null;

/** Lo llama el hook de inicio de sesión. Si cambia el usuario, descarta la contraseña anterior. */
export function fijarSesionSync(id: number, pass?: string | null): void {
  if (idUsuario !== id) password = null;
  idUsuario = id;
  if (pass) password = pass;
}

/** Lo llama el cierre de sesión. */
export function limpiarSesionSync(): void {
  idUsuario = null;
  password = null;
}

export const usuarioSesionSync = (): number | null => idUsuario;
export const passwordSesionSync = (): string | null => password;
