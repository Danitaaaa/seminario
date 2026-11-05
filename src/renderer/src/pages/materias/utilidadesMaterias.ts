import type { Cuatrimestre, EstadoMateria, MateriaFormacion, Organizacion, TipoFormacion } from '../../types/materias';

export const TIPOS_FORMACION: { valor: TipoFormacion; nombre: string; ejemplo: string }[] = [
  { valor: 'grado', nombre: 'Carrera de grado', ejemplo: 'Ingenierías, licenciaturas' },
  { valor: 'pregrado', nombre: 'Carrera de pregrado', ejemplo: 'Tecnicaturas, profesorados' },
  { valor: 'posgrado', nombre: 'Posgrado', ejemplo: 'Especializaciones, maestrías' },
  { valor: 'curso', nombre: 'Curso', ejemplo: 'Online o presencial, corto' },
  { valor: 'academia', nombre: 'Academia o instituto', ejemplo: 'Idiomas, música, arte' },
  { valor: 'otro', nombre: 'Otro', ejemplo: 'Lo que quieras organizar' },
];

export const NOMBRE_TIPO = Object.fromEntries(TIPOS_FORMACION.map((t) => [t.valor, t.nombre])) as Record<TipoFormacion, string>;

export const ORGANIZACIONES: { valor: Organizacion; nombre: string }[] = [
  { valor: 'cuatrimestral', nombre: 'Por años y cuatrimestres' },
  { valor: 'anual', nombre: 'Por años (anual)' },
  { valor: 'modulos', nombre: 'Por módulos o niveles' },
  { valor: 'sin_division', nombre: 'Sin división' },
];

export const ESTADOS: { valor: EstadoMateria; nombre: string }[] = [
  { valor: 'no_cursada', nombre: 'No cursada' },
  { valor: 'cursando', nombre: 'Cursando' },
  { valor: 'libre', nombre: 'Libre' },
  { valor: 'regular', nombre: 'Regular' },
  { valor: 'aprobada', nombre: 'Aprobada' },
];

export const NOMBRE_ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.valor, e.nombre])) as Record<EstadoMateria, string>;

export const CUATRIMESTRES: { valor: Cuatrimestre; nombre: string }[] = [
  { valor: 'primero', nombre: '1er cuatrimestre' },
  { valor: 'segundo', nombre: '2do cuatrimestre' },
  { valor: 'anual', nombre: 'Anual' },
];

const NOMBRE_CUATRI = Object.fromEntries(CUATRIMESTRES.map((c) => [c.valor, c.nombre])) as Record<Cuatrimestre, string>;

export interface MomentoCursado {
  anioActual: number | null;
  cuatrimestreActual: 'primero' | 'segundo' | null;
}

// Estado con el que arranca una materia según dónde está el usuario en la carrera:
// - años anteriores: el estado elegido (Libre por defecto);
// - años siguientes: No cursada;
// - año actual: depende del cuatrimestre. Estando en el 2do, las del 1ro ya se cursaron
//   y las del 2do y las anuales están en curso. Estando en el 1ro, las del 2do todavía no.
export function estadoInicial(
  anio: number | null, cuatrimestre: Cuatrimestre | null, momento: MomentoCursado, estadoCursadas: EstadoMateria,
): EstadoMateria {
  const { anioActual, cuatrimestreActual } = momento;
  if (anioActual === null || anio === null || anio < anioActual) return estadoCursadas;
  if (anio > anioActual) return 'no_cursada';
  if (cuatrimestreActual === 'segundo' && cuatrimestre === 'primero') return estadoCursadas;
  if (cuatrimestreActual === 'primero' && cuatrimestre === 'segundo') return 'no_cursada';
  return 'cursando';
}

// 2.5 → "2 años y medio", 1 → "1 año", 0.5 → "medio año".
export function textoDuracion(anios: number): string {
  const enteros = Math.floor(anios);
  const medio = anios % 1 !== 0;
  if (enteros === 0) return 'medio año';
  return `${enteros} ${enteros === 1 ? 'año' : 'años'}${medio ? ' y medio' : ''}`;
}

// Para sugerir el cuatrimestre: de agosto en adelante se toma el 2do.
export const cuatrimestreDeHoy = (): 'primero' | 'segundo' => (new Date().getMonth() >= 7 ? 'segundo' : 'primero');

const CUATRI_CORTO: Record<Cuatrimestre, string> = { primero: '1C', segundo: '2C', anual: 'Anual' };
export const cuatrimestreCorto = (c: Cuatrimestre | null): string => (c ? CUATRI_CORTO[c] : '');

const ORDINALES = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo'];
export const nombreAnio = (anio: number | null): string => (anio ? `${ORDINALES[anio - 1]} año` : 'Sin año');

// Agrupa las materias por año, de menor a mayor; las que no tienen año van al final.
export function materiasPorAnio(materias: MateriaFormacion[]): { anio: number | null; materias: MateriaFormacion[] }[] {
  const grupos = new Map<number | null, MateriaFormacion[]>();
  for (const m of materias) grupos.set(m.anio, [...(grupos.get(m.anio) ?? []), m]);
  return [...grupos.entries()]
    .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
    .map(([anio, lista]) => ({ anio, materias: lista }));
}

export interface GrupoAnio {
  titulo: string;
  grupos: { titulo: string; materias: MateriaFormacion[] }[];
}

// Arma "Año 1 › 1er cuatrimestre › materias" a partir de la lista ya ordenada por el backend.
export function agruparPorAnio(materias: MateriaFormacion[]): GrupoAnio[] {
  const anios: GrupoAnio[] = [];
  for (const m of materias) {
    const tituloAnio = m.anio ? `Año ${m.anio}` : 'Sin año';
    let anio = anios.find((a) => a.titulo === tituloAnio);
    if (!anio) anios.push((anio = { titulo: tituloAnio, grupos: [] }));
    const tituloGrupo = m.cuatrimestre ? NOMBRE_CUATRI[m.cuatrimestre] : 'Sin cuatrimestre';
    let grupo = anio.grupos.find((g) => g.titulo === tituloGrupo);
    if (!grupo) anio.grupos.push((grupo = { titulo: tituloGrupo, materias: [] }));
    grupo.materias.push(m);
  }
  return anios;
}

// Electron envuelve el error como "Error invoking remote method '...': Error: <mensaje>".
export function mensajeDeError(err: unknown, generico: string): string {
  const texto = err instanceof Error ? err.message : String(err);
  const partes = texto.split('Error: ');
  return partes.length > 1 ? partes[partes.length - 1] : generico;
}

// Para quien tiene el plan en PDF o en foto: lo pega en cualquier IA junto con el plan
// y lo que le devuelve ya viene en el formato que entiende el lector de Syntra.
export const PROMPT_PLAN = `Te adjunto el plan de estudios de mi carrera o curso. Puede ser de cualquier universidad, instituto o academia, y venir en tabla, lista, PDF escaneado, foto o captura. Pasámelo a texto plano con este formato exacto, sin agregar nada más (ni explicaciones, ni títulos, ni comillas, ni tablas):

1er año
Primer cuatrimestre
Nombre de la materia
Nombre de la materia | Correlativa; Otra correlativa
Segundo cuatrimestre
Nombre de la materia
Anual
Nombre de la materia
2do año
...

La respuesta empieza directo con "1er año" (sin el nombre de la carrera ni otra línea antes).

Antes de empezar:
- Usá solo la tabla o lista de materias del plan. Ignorá resoluciones, contenidos mínimos, perfiles, cargas horarias, matrices de competencias, tablas de equivalencias, planes viejos o de transición y notas al pie.
- Si en el archivo hay más de una carrera o título, o la carrera tiene orientaciones, líneas, menciones o especialidades que se eligen, y no te dije cuál, preguntame cuál antes de responder. Después pasá solo las materias comunes y las de la que elegí.
- Si el plan está en varias imágenes y te falta alguna (por ejemplo dice "1 de 3"), avisame.
- Leé la tabla con cuidado: en las tablas con celdas combinadas, el año de la izquierda abarca varias filas; fijate en qué año cae cada materia. Si los cuatrimestres están en dos columnas, una al lado de la otra, primero pasá todas las de la columna del primer cuatrimestre y después las del segundo. Dos materias que están en la misma fila de columnas distintas son materias separadas, no correlativas.

Reglas para los años:
- Antes de las materias de cada año poné una línea con el año: "1er año", "2do año", "3er año", "4to año", "5to año", "6to año".
- Si el plan habla de "nivel", "curso", "ciclo" o "etapa" en vez de año, convertilo a año en orden (Nivel I = 1er año, Ciclo básico de 2 años = 1er y 2do año, etc.). Si no se puede saber, usá el orden en que aparecen.
- Si los semestres o cuatrimestres están numerados de corrido (1 a 10), cada dos son un año: 1 y 2 = 1er año, 3 y 4 = 2do año, y así. El impar es el primer cuatrimestre y el par el segundo.
- Si las materias están agrupadas en bloques, módulos o columnas que no son años (Bloque A, Bloque B, Campo de la formación general...), ignorá esos grupos y ordená todo por año.
- Si una materia no tiene año claro, ponela al final bajo "Sin año".
- Respetá el año y el período que dice el plan para cada materia. No los cambies ni los deduzcas por las correlativas ni por el orden en que aparecen en otra tabla.

Reglas para los períodos:
- Si el plan dice cuatrimestre o semestre, poné "Primer cuatrimestre", "Segundo cuatrimestre" o "Anual" antes de esas materias (semestre = cuatrimestre).
- Abreviaturas: "A" = Anual, "1C" = Primer cuatrimestre, "2C" = Segundo cuatrimestre. Si dice "1C-2C" o "2C-1C" (se dicta en los dos), usá el primero que aparece.
- Si el período no está escrito pero hay columnas de horas por cuatrimestre: con horas en los dos es Anual, con horas en uno solo es ese cuatrimestre.
- Si el plan dice que todo el cursado es anual, poné "Anual" en cada año. Si el período está junto al formato ("Asignatura anual", "Seminario cuatrimestral"), usalo.
- Si es bimestral, trimestral o por módulos, o no dice nada, no pongas ninguna línea de período.

Reglas para las materias:
- Una materia por línea, con el nombre completo. Si en el plan el nombre ocupa dos renglones, juntalo en uno.
- Escribí los nombres con mayúscula solo al principio y en los nombres propios (no todo en mayúsculas), con sus tildes, y sin abreviar ("Práct. Gral." = "Práctica General").
- Sin números de orden, códigos, horas, créditos, formato (asignatura, taller, seminario), marcas como "(Int)", "(M)", "(S)" o asteriscos, viñetas, barras invertidas ni punto final.
- Incluí prácticas, talleres, seminarios, tesis, trabajo final y proyecto final como materias.
- Electivas y optativas: si el plan trae una lista larga para elegir, no copies la lista. Poné "Electiva 1", "Electiva 2"... (u "Optativa 1"...) en el año que corresponde, tantas como pida el plan; si no dice cuántas, poné una sola.
- Si una materia se elige entre dos ("Latín II (o Filosofía del Lenguaje II)"), es una sola materia: dejala en una sola línea, "Latín II o Filosofía del Lenguaje II".
- Si una materia genérica se repite (Seminario electivo, Seminario optativo, Electiva, Optativa), numeralas en orden en todo el plan: "Seminario Electivo 1", "Seminario Electivo 2".
- Si otra materia aparece igual en varios años (por ejemplo "Práctica Profesionalizante" en 2do, 3er y 4to año), agregale el año entre paréntesis: "Práctica Profesionalizante (2do año)", "Práctica Profesionalizante (3er año)".
- No incluyas títulos de secciones, áreas, totales ni títulos intermedios.

Reglas para las correlativas:
- La barra " | " es solo para correlativas. Nunca la uses para poner dos materias en la misma línea.
- Si el plan dice qué materias hay que tener para cursar o rendir otra (en una columna o tabla de correlatividades), ponelas en la misma línea de esa materia, después de " | ", separadas con ";".
- Escribí cada correlativa con el nombre EXACTO con el que la escribiste en su propia línea (incluido el año entre paréntesis si se lo agregaste). Si el plan la abrevia o la escribe distinto, buscá a qué materia corresponde.
- Si el plan las indica con número de orden, buscá a qué materia corresponde cada número y poné su nombre. "1-4" o "1-2-4" son esas materias sueltas; "1 a 6" es de la 1 a la 6. Un guion solo ("-", "–") es que no tiene.
- Si el plan separa correlativas "regularizadas" y "aprobadas", o "para cursar" y "para rendir", ponelas todas juntas, sin aclarar cuál es cuál.
- Si una regla dice "todas las materias anteriores" o similar, no la pongas como correlativa.
- Si una materia no tiene correlativas o el plan no las dice, no pongas la barra.

No resumas ni inventes materias ni correlativas: si algo no se lee bien, copialo como está.`;
