const PREFIJOS = [
  'quiero ir al ',
  'quiero ir a ',
  'quiero abrir ',
  'llevame a ',
  'llevarme a ',
  'abrir ',
  'abre ',
  'abri ',
  'abrime ',
  'mostrar ',
  'mostrame ',
  'ir al ',
  'ir a ',
  'anda a ',
  've a ',
];

const FRASES_CANONICAS: Record<string, string> = {
  'flash cards': 'flashcards',
  'las flashcards': 'flashcards',
  'tarjetas': 'flashcards',
  'tarjetas de memoria': 'flashcards',
  'material de estudio': 'material',
  'materiales de estudio': 'material',
  'el calendario': 'calendario',
  'la agenda': 'calendario',
  'agenda': 'calendario',
  'los horarios': 'horarios',
  'horario': 'horarios',
  'sesion': 'sesiones de estudio',
  'sesiones': 'sesiones de estudio',
  'sesion de estudio': 'sesiones de estudio',
  'sesiones estudio': 'sesiones de estudio',
  'cerrar la sesion': 'cerrar sesion',
  'cerrar cuenta': 'cerrar sesion',
  'salir de la cuenta': 'cerrar sesion',
  'cerra sesion': 'cerrar sesion',
  'cerra la sesion': 'cerrar sesion',
  'necesito ayuda': 'ayuda',
  'ayudame': 'ayuda',
};

function quitarPrefijo(texto: string): string {
  const prefijo = PREFIJOS.find((candidato) => texto.startsWith(candidato));
  return prefijo ? texto.slice(prefijo.length).trim() : texto;
}

export function normalizarComando(texto: string): string {
  const sinTildesNiSignos = texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sinPrefijo = quitarPrefijo(sinTildesNiSignos);
  return FRASES_CANONICAS[sinPrefijo] ?? sinPrefijo;
}
