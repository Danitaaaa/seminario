// src/main/logicaPersistente/gestionDeMaterialIA/propuestas.ts
// Funciones puras que convierten la propuesta de la IA (PropuestaIA.contenido) a lo que muestra cada pantalla.
// Aceptan los dos nombres de campo posibles (frente/dorso o pregunta/respuesta) para no depender del esquema exacto.

export interface TarjetaPropuesta {
  pregunta: string;
  respuesta: string;
  /** Fragmento del material de donde salió (para que la persona verifique). */
  fuente: string | null;
}

export interface PreguntaPropuesta {
  enunciado: string;
  opciones: string[];
  /** Índice dentro de `opciones`. */
  correcta: number;
  explicacion: string | null;
}

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const registro = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function tarjetasDePropuesta(contenido: unknown): TarjetaPropuesta[] {
  const lista = registro(contenido).tarjetas;
  if (!Array.isArray(lista)) throw new Error('La IA no devolvió flashcards.');
  const tarjetas: TarjetaPropuesta[] = [];
  for (const item of lista) {
    const t = registro(item);
    const pregunta = texto(t.frente ?? t.pregunta);
    const respuesta = texto(t.dorso ?? t.respuesta);
    if (pregunta && respuesta) tarjetas.push({ pregunta, respuesta, fuente: texto(t.fuente) || null });
  }
  if (tarjetas.length === 0) throw new Error('La IA no devolvió flashcards utilizables.');
  return tarjetas;
}

export function preguntasDePropuesta(contenido: unknown): PreguntaPropuesta[] {
  const lista = registro(contenido).preguntas;
  if (!Array.isArray(lista)) throw new Error('La IA no devolvió preguntas.');
  const preguntas: PreguntaPropuesta[] = [];
  for (const item of lista) {
    const p = registro(item);
    const opciones = Array.isArray(p.opciones) ? p.opciones.map(texto).filter(Boolean) : [];
    const correcta = typeof p.correcta === 'number' ? p.correcta : -1;
    const enunciado = texto(p.enunciado ?? p.pregunta);
    if (enunciado && opciones.length >= 2 && Number.isInteger(correcta) && correcta >= 0 && correcta < opciones.length) {
      preguntas.push({ enunciado, opciones, correcta, explicacion: texto(p.explicacion) || null });
    }
  }
  if (preguntas.length === 0) throw new Error('La IA no devolvió preguntas utilizables.');
  return preguntas;
}

/** "Apuntes/Base de Datos.pdf" → "Base de Datos" (el mazo se llama como el archivo; el nombre del mazo admite 50). */
export function nombreMazoDe(fuente: string): string {
  const base = fuente.split(/[\\/]/).pop() ?? '';
  const sinExtension = base.replace(/\.[A-Za-z0-9]{1,5}$/, '').trim();
  return (sinExtension || 'Flashcards con IA').slice(0, 50).trim();
}

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

const escapar = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Guía de preguntas en HTML para el editor (Tiptap) y para convertir a .docx:
 * título, preguntas numeradas con sus opciones y, AL FINAL, las respuestas con su explicación.
 * La numeración y las letras van escritas a mano: así se conservan igual en el editor y en el Word.
 */
export function guiaAHtml(titulo: string, preguntas: PreguntaPropuesta[]): string {
  const partes: string[] = [`<h1>${escapar(titulo)}</h1>`];
  partes.push('<p>Elegí la opción correcta en cada pregunta. Las respuestas están al final del documento.</p>');

  preguntas.forEach((p, i) => {
    partes.push(`<p><strong>${i + 1}. ${escapar(p.enunciado)}</strong></p>`);
    p.opciones.forEach((o, j) => partes.push(`<p>${LETRAS[j] ?? j + 1}) ${escapar(o)}</p>`));
  });

  partes.push('<h2>Respuestas</h2>');
  preguntas.forEach((p, i) => {
    const letra = LETRAS[p.correcta] ?? String(p.correcta + 1);
    const correcta = p.opciones[p.correcta] ?? '';
    const explicacion = p.explicacion ? ` — ${escapar(p.explicacion)}` : '';
    partes.push(`<p><strong>${i + 1}.</strong> ${letra}) ${escapar(correcta)}${explicacion}</p>`);
  });
  return partes.join('\n');
}

/** Indicaciones del usuario + cantidad pedida, en el único texto `preferencias` que ya acepta el módulo (máx. 2000). */
export function armarPreferencias(cantidadFrase: string | null, indicaciones?: string): string | undefined {
  const partes = [cantidadFrase, indicaciones?.trim()].filter((x): x is string => Boolean(x));
  return partes.length ? partes.join('\n').slice(0, 2000) : undefined;
}

export interface PreguntaGuia {
  enunciado: string;
  respuesta: string;
  tema: string | null;
}

export function preguntasDeGuia(contenido: unknown): PreguntaGuia[] {
  const lista = registro(contenido).preguntas;
  if (!Array.isArray(lista)) throw new Error('La IA no devolvió preguntas.');
  const preguntas: PreguntaGuia[] = [];
  for (const item of lista) {
    const p = registro(item);
    const enunciado = texto(p.enunciado ?? p.pregunta);
    const respuesta = texto(p.respuesta);
    if (enunciado && respuesta) preguntas.push({ enunciado, respuesta, tema: texto(p.tema) || null });
  }
  if (preguntas.length === 0) throw new Error('La IA no devolvió preguntas utilizables.');
  return preguntas;
}

/**
 * Resumen en HTML para el editor (Tiptap) y para convertir a .docx: título, ideas clave en lista
 * y una sección (título + párrafos) por tema. Los saltos de línea dobles del contenido son párrafos.
 */
export function resumenAHtml(contenido: unknown): string {
  const r = registro(contenido);
  const titulo = texto(r.titulo) || 'Resumen';
  const ideas = Array.isArray(r.ideasClave) ? r.ideasClave.map(texto).filter(Boolean) : [];
  const secciones = Array.isArray(r.secciones) ? r.secciones.map(registro) : [];
  if (ideas.length === 0 && secciones.length === 0) throw new Error('La IA no devolvió un resumen utilizable.');

  const partes: string[] = [`<h1>${escapar(titulo)}</h1>`];
  if (ideas.length) {
    partes.push('<h2>Ideas clave</h2>', '<ul>', ...ideas.map((i) => `<li><p>${escapar(i)}</p></li>`), '</ul>');
  }
  for (const s of secciones) {
    const tituloSeccion = texto(s.titulo);
    if (tituloSeccion) partes.push(`<h2>${escapar(tituloSeccion)}</h2>`);
    for (const parrafo of texto(s.contenido).split(/\n\s*\n/)) {
      if (parrafo.trim()) partes.push(`<p>${escapar(parrafo.trim()).replace(/\n/g, '<br>')}</p>`);
    }
  }
  return partes.join('\n');
}

export function guiaPreguntasAHtml(titulo: string, preguntas: PreguntaGuia[]): string {
  const partes: string[] = [`<h1>${escapar(titulo)}</h1>`];
  partes.push('<p>Respondé cada pregunta con tus palabras. Las respuestas modelo están al final del documento.</p>');

  let temaActual: string | null | undefined;
  preguntas.forEach((p, i) => {
    if (p.tema && p.tema !== temaActual) partes.push(`<h2>${escapar(p.tema)}</h2>`);
    temaActual = p.tema;
    partes.push(`<p><strong>${i + 1}. ${escapar(p.enunciado)}</strong></p>`);
  });

  partes.push('<h2>Respuestas</h2>');
  preguntas.forEach((p, i) => {
    partes.push(`<p><strong>${i + 1}.</strong> ${escapar(p.respuesta)}</p>`);
  });
  return partes.join('\n');
}