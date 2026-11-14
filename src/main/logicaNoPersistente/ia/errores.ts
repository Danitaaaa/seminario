// src/main/logicaNoPersistente/ia/errores.ts

export type Causa =
  | 'abortado'
  | 'red'
  | 'timeout'
  | 'auth'
  | 'cuota'
  | 'servidor'
  | 'salida_invalida'
  | 'sin_clave'
  | 'desconocido';

export class ErrorProveedor extends Error {
  constructor(
    readonly causa: Causa,
    readonly proveedor: string,
    mensaje: string,
    opciones?: { cause?: unknown },
  ) {
    super(mensaje, opciones);
    this.name = 'ErrorProveedor';
  }
}

/** Todos los proveedores de la cadena fallaron. */
export class ErrorRouter extends Error {
  constructor(readonly fallos: ErrorProveedor[]) {
    super(
      'Ningún proveedor pudo responder: ' +
        (fallos.map((f) => `${f.proveedor}(${f.causa})`).join(', ') || 'ninguno disponible (sin internet, sin claves o Ollama apagado)'),
    );
    this.name = 'ErrorRouter';
  }
}

export class ErrorAbortado extends Error {
  constructor(mensaje = 'Operación cancelada') {
    super(mensaje);
    this.name = 'AbortError';
  }
}

export function esAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

/** Convierte cualquier error de SDK/fetch en un ErrorProveedor con causa. */
export function clasificar(e: unknown, proveedor: string): ErrorProveedor {
  if (e instanceof ErrorProveedor) return e;
  if (esAbort(e)) return new ErrorProveedor('abortado', proveedor, 'Cancelado', { cause: e });

  if (e instanceof Error && e.name === 'TimeoutError')
    return new ErrorProveedor('timeout', proveedor, 'El proveedor tardó demasiado', { cause: e });

  const status = (e as { status?: unknown } | null)?.status;
  if (typeof status === 'number') {
    if (status === 401 || status === 403)
      return new ErrorProveedor('auth', proveedor, 'Clave inválida o sin permisos', { cause: e });
    if (status === 429)
      return new ErrorProveedor('cuota', proveedor, 'Cuota o límite de velocidad', { cause: e });
    if (status >= 500)
      return new ErrorProveedor('servidor', proveedor, `Error del servidor (${status})`, {
        cause: e,
      });
  }

  const codigo = (e as { cause?: { code?: string } } | null)?.cause?.code ?? '';
  if (e instanceof TypeError || /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/.test(codigo))
    return new ErrorProveedor('red', proveedor, 'Sin conexión con el proveedor', { cause: e });

  return new ErrorProveedor('desconocido', proveedor, e instanceof Error ? e.message : String(e), {
    cause: e,
  });
}
