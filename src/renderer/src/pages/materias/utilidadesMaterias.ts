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
export const PROMPT_PLAN = `Te adjunto el plan de estudios de mi carrera. Pasámelo a texto plano con este formato exacto, sin agregar nada más:

1er año
Primer cuatrimestre
Nombre de la materia
Nombre de la materia
Segundo cuatrimestre
Nombre de la materia
Anual
Nombre de la materia
2do año
...

Reglas:
- Una materia por línea, con el nombre completo tal como figura en el plan.
- Sin números, códigos, horas, correlativas, viñetas ni punto final.
- Antes de las materias de cada año, una línea con el año ("1er año", "2do año"...).
- Si el plan dice el cuatrimestre, poné "Primer cuatrimestre", "Segundo cuatrimestre" o "Anual" antes de esas materias. Si no lo dice, no pongas ninguno.
- Incluí electivas, prácticas y proyecto final como si fueran materias.
- No incluyas títulos de secciones, totales ni notas al pie.
- Si una materia no tiene año claro, ponela al final bajo "Sin año".
- No resumas ni inventes materias: si algo no se lee bien, copialo como está.`;
