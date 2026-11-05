// Traduce los errores de Postgres que puede ver el usuario.
export function traducirError(error: any): Error {
  if (error?.code === '23505') return new Error('Esa materia ya tiene un cuaderno.');
  return error instanceof Error ? error : new Error(String(error));
}
