// Los métodos de estudio salen de la tabla tipo_metodo_estudio. Se reconocen por el nombre
// (sin importar mayúsculas ni acentos) para saber qué mostrar de cada uno en la sesión.
export type ClaseMetodo = 'flashcards' | 'repeticiones' | 'mapa-mental' | 'practica-activa' | 'otro';

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function claseDeMetodo(nombre: string): ClaseMetodo {
  const n = normalizar(nombre);
  if (n.includes('flashcard')) return 'flashcards';
  if (n.includes('repeticion')) return 'repeticiones';
  if (n.includes('mapa')) return 'mapa-mental';
  if (n.includes('practica')) return 'practica-activa';
  return 'otro';
}
