const CLAVE = 'usuarioId';
const CLAVE_GLOBAL = 'usuarioIdGlobal';

export function obtenerUsuarioId(): number | null {
  const valor = localStorage.getItem(CLAVE);
  return valor ? Number(valor) : null;
}

export function obtenerUsuarioIdGlobal(): string | null {
  return localStorage.getItem(CLAVE_GLOBAL);
}

// Devuelve el id global; si no está guardado, lo pide al main (que lo genera si hace falta).
export async function asegurarUsuarioIdGlobal(): Promise<string | null> {
  const guardado = localStorage.getItem(CLAVE_GLOBAL);
  if (guardado) return guardado;

  const id = obtenerUsuarioId();
  if (id === null) return null;

  try {
    const g = await window.api.obtenerIdGlobal(id);
    if (g) localStorage.setItem(CLAVE_GLOBAL, g);
    return g ?? null;
  } catch (e) {
    console.error('[sesion] No se pudo obtener el id global:', e);
    return null;
  }
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE);
  localStorage.removeItem(CLAVE_GLOBAL);
  window.api.cerrarSesion().catch((error) => console.error('[sesion] No se pudo cerrar la sesión en el main:', error));
}

export function guardarSesion(usuarioId: number): void {
  localStorage.setItem(CLAVE, String(usuarioId));
  localStorage.removeItem(CLAVE_GLOBAL);
  window.api.obtenerIdGlobal(usuarioId)
    .then((g) => { if (g) localStorage.setItem(CLAVE_GLOBAL, g); })
    .catch((e) => console.error('[sesion] No se pudo obtener el id global:', e));
}