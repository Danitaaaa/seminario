// Traduce los errores de Postgres que puede ver el usuario.
export function traducirError(error: any): Error {
  if (error?.code === '23505') return new Error('Ya existe una materia con ese nombre en esta formación.');
  if (error?.code === '23503') return new Error('Hay sesiones de estudio con esta materia. Cambiales la materia o eliminalas primero.');
  return error instanceof Error ? error : new Error(String(error));
}
