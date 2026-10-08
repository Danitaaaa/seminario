const CLAVE = 'usuarioId';

export function obtenerUsuarioId(): number | null {
  const valor = localStorage.getItem(CLAVE);
  return valor ? Number(valor) : null;
}

export function guardarSesion(usuarioId: number): void {
  localStorage.setItem(CLAVE, String(usuarioId));
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE);
}