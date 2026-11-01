// Lee el texto de un plan de estudios pegado por el usuario y arma la lista de materias.
// No usa IA: reconoce los títulos de año ("Primer año", "2° año", "Año 3") y de cuatrimestre
// ("Primer cuatrimestre", "2do cuatrimestre", "Anual"); el resto de las líneas son materias.

export type CuatrimestreLeido = 'primero' | 'segundo' | 'anual';

export interface MateriaLeida {
  nombre: string;
  anio: number | null;
  cuatrimestre: CuatrimestreLeido | null;
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
  const numero = t.match(/\b(\d{1,2})[\s.]*(?:°|º|o|er|ro|do|to|vo|mo|no)?[\s.]*ano\b/) ?? t.match(/\bano\s*(\d{1,2})\b/);
  if (numero) return Number(numero[1]);
  const palabra = t.match(/\b(primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto)\s+ano\b/);
  return palabra ? ORDINALES[palabra[1]] : null;
}

function leerCuatrimestre(linea: string): CuatrimestreLeido | null {
  const t = sinAcentos(linea);
  if (/\banual(es)?\b|\(\s*a\s*\)/.test(t)) return 'anual';
  if (/\b(1[\s.]*(?:°|º|er|ro)?|primer|primero)[\s.]*cuat|\(\s*1\s*c\s*\)/.test(t)) return 'primero';
  if (/\b(2[\s.]*(?:°|º|do)?|segundo)[\s.]*cuat|\(\s*2\s*c\s*\)/.test(t)) return 'segundo';
  return null;
}

// Saca numeración, viñetas, códigos y horas: "3. Física I (96 hs)" → "Física I".
function limpiarNombre(linea: string): string {
  return linea
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
    const linea = original.trim();
    if (!linea) continue;

    const anioLinea = leerAnio(linea);
    const cuatriLinea = leerCuatrimestre(linea);
    const nombre = limpiarNombre(linea);
    const esTitulo = (anioLinea !== null || cuatriLinea !== null)
      && sinAcentos(nombre).replace(/[^a-z]/g, '').length <= 'segundocuatrimestre'.length + 6
      && /(ano|cuat|anual)/.test(sinAcentos(nombre));

    if (esTitulo) {
      if (anioLinea !== null) { anio = anioLinea; cuatrimestre = null; }
      if (cuatriLinea !== null) cuatrimestre = cuatriLinea;
      continue;
    }

    if (nombre.length < 3 || nombre.length > 100 || IGNORAR.test(nombre) || SUBTITULOS.test(nombre)
      || !/[a-záéíóúñ]/i.test(nombre)) continue;

    const clave = sinAcentos(nombre);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    // Una materia puede traer su cuatrimestre en la misma línea: "Física I - 2° cuatrimestre".
    materias.push({ nombre, anio, cuatrimestre: cuatriLinea ?? cuatrimestre });
  }
  return materias;
}
