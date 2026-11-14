// src/main/logicaNoPersistente/ia/tipos.ts
// Tipos de todo el módulo de IA (no importa nada de otros archivos).

// ---------- Tareas ----------

export const TAREAS = [
  'resumen',
  'cuestionario',
  'flashcards',
  'guia',
  'plan',
  'mapaMental', // mismo nombre que usa Material con IA (pantalla previa y tabla materiales_ia)
  'materias',
  'chat', // Chat con IA (preguntas libres, sin material)
  'transcripcionPlan', // pasar a texto un plan de estudios escaneado o en foto (lee imágenes)
] as const;
export type Tarea = (typeof TAREAS)[number]; // 'resumen' | 'cuestionario' | ...

// Las que se generan desde un archivo de Material y se revisan en la pantalla previa.
export const TIPOS_MATERIAL_IA = ['resumen', 'cuestionario', 'mapaMental', 'flashcards', 'materias', 'guia'] as const satisfies readonly Tarea[];
export type TipoMaterialIA = (typeof TIPOS_MATERIAL_IA)[number];

// ---------- Archivos de fuente ----------

export const EXTENSIONES_FUENTE_IA = ['pdf', 'docx'] as const;
export type ExtensionFuenteIA = (typeof EXTENSIONES_FUENTE_IA)[number];

export const esFuenteIA = (extension: string): extension is ExtensionFuenteIA =>
  (EXTENSIONES_FUENTE_IA as readonly string[]).includes(extension.toLowerCase());

// ---------- Router y proveedores ----------

/** Cualquier cosa con .parse() sirve: un schema de zod cumple esto sin importarlo. */
export interface Esquema<T> {
  parse(dato: unknown): T;
}

export interface PedidoGeneracion<T> {
  sistema: string; // instrucciones fijas de la app
  usuario: string; // material + preferencias (en secciones delimitadas)
  esquema: Esquema<T>; // valida la respuesta
  esquemaJson: object; // el mismo esquema como JSON Schema (para el modelo)
  signal?: AbortSignal; // para cancelar
  /** Imágenes para que el modelo las lea (JPEG o PNG en base64, sin el prefijo data:). */
  imagenes?: string[];
}

/** Lo que recibe un proveedor: no necesita el validador, solo el JSON Schema. */
export type PedidoCrudo = Pick<
  PedidoGeneracion<unknown>,
  'sistema' | 'usuario' | 'esquemaJson' | 'signal' | 'imagenes'
>;

export interface ResultadoGeneracion<T> {
  dato: T;
  proveedor: string;
  ms: number;
  intentos: number;
}

export interface ProveedorModelo {
  readonly id: string; // 'luna' | 'gemini' | 'gemma'
  readonly tipo: 'online' | 'local';
  /** Rápido y sin costo: ¿vale la pena intentar con este proveedor? */
  disponible(): Promise<boolean>;
  /** Devuelve TEXTO (se espera JSON). El router valida. */
  generarJson(pedido: PedidoCrudo): Promise<string>;
}