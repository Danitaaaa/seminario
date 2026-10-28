const CLAVE = 'usuarioId';

export function obtenerUsuarioId(): number | null {
  const valor = localStorage.getItem(CLAVE);
  return valor ? Number(valor) : null;
}

// Además de olvidar al usuario en la ventana, le avisa al main para que detenga la sincronización.
export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE);
  window.api.cerrarSesion().catch((error) => console.error('[sesion] No se pudo cerrar la sesión en el main:', error));
}

export function guardarSesion(usuarioId: number): void {
  localStorage.setItem(CLAVE, String(usuarioId));
}