// Lee el texto de un plan de estudios pegado por el usuario y arma la lista de materias.
// No usa IA: reconoce los títulos de año ("Primer año", "2° año", "Año 3") y de cuatrimestre
// ("Primer cuatrimestre", "2do cuatrimestre", "Anual"); el resto de las líneas son materias.
// Las correlativas van en la misma línea después de " | ", separadas con ";".

export type CuatrimestreLeido = 'primero' | 'segundo' | 'anual';

export interface MateriaLeida {
  nombre: string;
  anio: number | null;
  cuatrimestre: CuatrimestreLeido | null;
  correlativas: string[];
}

const ORDINALES: Record<string, number> = {
  primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6,
};

// Encabezados de tabla y renglones que no son materias.
const IGNORAR = /^(c[oó]digo|asignaturas?|espacios? curriculares?|horas?|carga horaria|correlativas?|plan de estudios?|total|r[eé]gimen|modalidad)\b/i;
// Subtítulos que separan grupos dentro de un año ("Materias electivas", "Práctica"): no son materias.
const SUBTITULOS = /^(materias?( electivas| obligatorias| optativas)?|electivas|optativas|t[ií]tulo intermedio|pr[aá]cticas?( profesionales?)?)$/i;

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function leerAnio(linea: string): number | null {
  const t = sinAcentos(linea);
  // "1° año", "1.º año", "2do año", "3.er año", "Año 3"
  // "Nivel I" / "1er nivel" cuentan como año.
  const romano = t.match(/\b(?:ano|nivel)\s+(i{1,3}|iv|v|vi)\b/);
  if (romano) return ['i', 'ii', 'iii', 'iv', 'v', 'vi'].indexOf(romano[1]) + 1;
  const numero = t.match(/\b(\d{1,2})[\s.]*(?:°|º|o|er|ro|do|to|vo|mo|no)?[\s.]*(?:ano|nivel)\b/) ?? t.match(/\b(?:ano|nivel)\s*(\d{1,2})\b/);
  if (numero) return Number(numero[1]);
  const palabra = t.match(/\b(primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto)\s+(?:ano|nivel)\b/);
  return palabra ? ORDINALES[palabra[1]] : null;
}

function leerCuatrimestre(linea: string): CuatrimestreLeido | null {
  const t = sinAcentos(linea);
  if (/\banual(es)?\b|\(\s*a\s*\)/.test(t)) return 'anual';
  // "semestre" se toma como cuatrimestre.
  if (/\b(1[\s.]*(?:°|º|er|ro)?|primer|primero)[\s.]*(cuat|semestre)|\(\s*1\s*c\s*\)/.test(t)) return 'primero';
  if (/\b(2[\s.]*(?:°|º|do)?|segundo)[\s.]*(cuat|semestre)|\(\s*2\s*c\s*\)/.test(t)) return 'segundo';
  return null;
}

const esNombreValido = (nombre: string) =>
  nombre.length >= 3 && nombre.length <= 100 && /[a-záéíóúñ]/i.test(nombre);

// Saca numeración, viñetas, códigos y horas: "3. Física I (96 hs)" → "Física I".
function limpiarNombre(linea: string): string {
  return linea
    .replace(/[\\/]+\s*$/, '') // barras sueltas al final que deja el copiado desde PDF: "Física I\\"
    .replace(/^[\s\-–•*·]+/, '')
    .replace(/^\(?[A-Z]{0,4}\d{1,4}[.)\-:]?\s+/, '')
    .replace(/\s*[\t|].*$/, '')
    .replace(/[.;,]+$/, '') // primero el punto final, así "Física I (96 hs)." también pierde las horas
    .replace(/\s*\(?\d+\s*(hs|horas|h)\.?\)?\s*$/i, '')
    .replace(/\s*[-–]\s*(anual|1(?:°|º)?\s*cuat\w*|2(?:°|º)?\s*cuat\w*)\s*\.?$/i, '')
    .replace(/\s*\((1c|2c|a)\)\s*\.?$/i, '')
    .replace(/[.;,]+$/, '')
    .trim();
}

export function leerPlanEstudios(texto: string): MateriaLeida[] {
  const materias: MateriaLeida[] = [];
  const vistas = new Set<string>();
  let anio: number | null = null;
  let cuatrimestre: CuatrimestreLeido | null = null;

  for (const original of texto.split(/\r?\n/)) {
    // "Diseño de Sistemas | Análisis de Sistemas; Paradigmas" → materia y sus correlativas.
    const [delante, ...detras] = original.split('|');
    const linea = delante.trim();
    if (!linea) continue;

    // Lo de después de la barra son correlativas, salvo los títulos sueltos ("Anual", "2° año") de una tabla pegada.
    const correlativas = detras.join('|').split(';').map(limpiarNombre)
      .filter((c) => esNombreValido(c) && leerAnio(c) === null && leerCuatrimestre(c) === null);
    const anioLinea = leerAnio(linea);
    const cuatriLinea = leerCuatrimestre(linea) ?? (correlativas.length === 0 ? leerCuatrimestre(original) : null);
    const nombre = limpiarNombre(linea);
    const esTitulo = (anioLinea !== null || cuatriLinea !== null)
      && sinAcentos(nombre).replace(/[^a-z]/g, '').length <= 'segundocuatrimestre'.length + 6
      && /(ano|nivel|cuat|semestre|anual)/.test(sinAcentos(nombre));

    // "Sin año": lo que sigue no tiene año (electivas, por ejemplo).
    if (/^sin\s+ano$/.test(sinAcentos(nombre))) {
      anio = null;
      cuatrimestre = null;
      continue;
    }

    if (esTitulo) {
      if (anioLinea !== null) { anio = anioLinea; cuatrimestre = null; }
      if (cuatriLinea !== null) cuatrimestre = cuatriLinea;
      continue;
    }

    if (!esNombreValido(nombre) || IGNORAR.test(nombre) || SUBTITULOS.test(nombre)) continue;

    const clave = sinAcentos(nombre);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    // Una materia puede traer su cuatrimestre en la misma línea: "Física I - 2° cuatrimestre".
    materias.push({ nombre, anio, cuatrimestre: cuatriLinea ?? cuatrimestre, correlativas });
  }
  return materias;
}
