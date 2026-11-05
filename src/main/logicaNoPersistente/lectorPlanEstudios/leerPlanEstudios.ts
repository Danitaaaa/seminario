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
    // Marcas y códigos de los planes: "(Int)", "(M)", "(S)", "(FCJS220)", "(!)", asteriscos.
    .replace(/\s*\((?:int\.?|m|s|!)\)/gi, '')
    .replace(/\s*\((?=[A-Z0-9]*\d)[A-Z]{1,}[A-Z0-9]*\)/g, '')
    .replace(/\s*\*+/g, '')
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

// Planes escritos todo en mayúsculas: "HISTORIA DEL ARTE 1" → "Historia del Arte 1".
const MENORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'en', 'a', 'al', 'para', 'con', 'por', 'sin']);
const ROMANO = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;
function capitalizar(nombre: string): string {
  const sinParentesis = nombre.replace(/\([^)]*\)/g, '');
  if (sinParentesis !== sinParentesis.toUpperCase() || !/[A-ZÁÉÍÓÚÑ]{4}/.test(sinParentesis)) return nombre;
  return nombre.toLowerCase().split(' ').map((p, i) => {
    if (ROMANO.test(p)) return p.toUpperCase();
    if (p.startsWith('(')) return p; // "(1er año)" queda como está
    if (i > 0 && MENORES.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

const ORDINAL_ANIO = ['', '1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo'];

export function leerPlanEstudios(texto: string): MateriaLeida[] {
  const materias: MateriaLeida[] = [];
  // nombre sin acentos → año y cuatrimestre en que apareció
  const vistas = new Map<string, { anio: number | null; cuatrimestre: CuatrimestreLeido | null }>();
  let anio: number | null = null;
  let cuatrimestre: CuatrimestreLeido | null = null;

  for (const original of texto.split(/\r?\n/)) {
    // "Diseño de Sistemas | Análisis de Sistemas; Paradigmas" → materia y sus correlativas.
    const [delante, ...detras] = original.split('|');
    const linea = delante.trim();
    if (!linea) continue;

    // Lo de después de la barra son correlativas, salvo los títulos sueltos ("Anual", "2° año") de una tabla pegada.
    const correlativas = detras.join('|').split(';').map((c) => capitalizar(limpiarNombre(c)))
      .filter((c) => esNombreValido(c) && !(leerAnio(c) !== null && !c.includes('(')) && leerCuatrimestre(c) === null);
    const anioLinea = leerAnio(linea);
    const cuatriLinea = leerCuatrimestre(linea) ?? (correlativas.length === 0 ? leerCuatrimestre(original) : null);
    let nombre = capitalizar(limpiarNombre(linea));
    const esTitulo = (anioLinea !== null || cuatriLinea !== null)
      && sinAcentos(nombre).replace(/[^a-z]/g, '').length <= 'segundocuatrimestre'.length + 6
      && /(ano|nivel|cuat|semestre|anual)/.test(sinAcentos(nombre))
      // "Canto 2 (2do año)" es una materia con su año aclarado, no un título.
      && !/\(.*\b(ano|nivel)\b.*\)/.test(sinAcentos(nombre));

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

    let clave = sinAcentos(nombre);
    const periodo = cuatriLinea ?? cuatrimestre;
    const anterior = vistas.get(clave);
    if (anterior) {
      // Repetida en el mismo lugar: es la misma materia copiada dos veces.
      if (anterior.anio === anio && anterior.cuatrimestre === periodo) continue;
      // En otro año ("Práctica Profesionalizante" en 2°, 3° y 4°) lleva el año;
      // en el mismo año ("Seminario optativo" en los dos cuatrimestres) lleva un número.
      const base = nombre;
      nombre = anio !== null && anterior.anio !== anio ? `${base} (${ORDINAL_ANIO[anio] ?? `${anio}°`} año)` : `${base} 2`;
      for (let n = 3; vistas.has(sinAcentos(nombre)); n++) nombre = `${base} ${n}`;
      clave = sinAcentos(nombre);
    }
    vistas.set(clave, { anio, cuatrimestre: periodo });
    // Una materia puede traer su cuatrimestre en la misma línea: "Física I - 2° cuatrimestre".
    materias.push({ nombre, anio, cuatrimestre: periodo, correlativas });
  }
  return emparejarCorrelativas(materias);
}

// Las correlativas a veces vienen escritas distinto que la materia ("Práct. Gral. de la Traducción II",
// "Estudio Comparativo" por "Estudios Comparativos"). Se cambian por el nombre de la materia del plan
// cuando hay una sola que coincide; las que no coinciden quedan como están y la pantalla avisa.
const palabras = (t: string) => sinAcentos(t).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const esNumero = (p: string) => ROMANO.test(p) || /^\d/.test(p);

// "gral" coincide con "general": mismas letras en orden, empezando igual.
function abrevia(corta: string, larga: string): boolean {
  if (larga.startsWith(corta)) return true;
  if (corta[0] !== larga[0]) return false;
  let i = 0;
  for (const letra of larga) if (letra === corta[i]) i++;
  return i === corta.length;
}

// El año entre paréntesis ("(2do año)") se compara aparte, con el año de la materia.
const ANIO_ENTRE_PARENTESIS = /\s*\(([^)]*)\ba[nñ]o\)$/i;

function coincide(correlativa: string, materia: MateriaLeida): boolean {
  const anio = correlativa.match(ANIO_ENTRE_PARENTESIS);
  if (anio && leerAnio(`${anio[1]} año`) !== materia.anio) return false;
  const c = palabras(correlativa.replace(ANIO_ENTRE_PARENTESIS, ''));
  const m = palabras(materia.nombre.replace(ANIO_ENTRE_PARENTESIS, ''));
  // Los números (I, II, 2) tienen que ser los mismos: "Lengua" no es "Lengua II".
  if (c.filter(esNumero).join() !== m.filter(esNumero).join() || c[0] !== m[0] && !abrevia(c[0], m[0])) return false;
  let j = 0;
  for (const p of c.filter((x) => !esNumero(x))) {
    while (j < m.length && (esNumero(m[j]) || !abrevia(p, m[j]))) j++;
    if (j === m.length) return false;
    j++;
  }
  return true;
}

function emparejarCorrelativas(materias: MateriaLeida[]): MateriaLeida[] {
  const exactos = new Map(materias.map((m) => [palabras(m.nombre).join(' '), m.nombre]));
  return materias.map((m) => ({
    ...m,
    correlativas: [...new Set(m.correlativas.map((c) => {
      const exacto = exactos.get(palabras(c).join(' '));
      if (exacto) return exacto;
      const candidatas = materias.filter((o) => o !== m && coincide(c, o));
      return candidatas.length === 1 ? candidatas[0].nombre : c;
    }))],
  }));
}
