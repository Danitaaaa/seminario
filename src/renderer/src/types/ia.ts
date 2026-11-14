export type TipoMaterialIA = 'resumen' | 'cuestionario' | 'mapaMental';

export const EXTENSIONES_FUENTE_IA = ['pdf', 'docx'];
export const esFuenteIA = (extension: string | null | undefined) =>
  !!extension && EXTENSIONES_FUENTE_IA.includes(extension.toLowerCase());

export const NOMBRE_TIPO_IA: Record<TipoMaterialIA, string> = {
  resumen: 'Resumen',
  cuestionario: 'Cuestionario',
  mapaMental: 'Mapa mental',
};

// Pantalla de Métodos donde se ve cada tipo guardado.
export const RUTA_TIPO_IA: Record<TipoMaterialIA, string> = {
  resumen: '/resumenes',
  cuestionario: '/cuestionarios',
  mapaMental: '/mapas-mentales',
};

// El router informa qué IA respondió; si es una que no está acá, se muestra tal cual.
const NOMBRES_PROVEEDOR: Record<string, string> = {
  gptMini: 'GptMini (Azure)',
  azure: 'GptMini (Azure)',
  luna: 'Luna (Azure)', // materiales guardados antes del cambio a GptMini
  gemini: 'Gemini',
  gemma: 'Gemma (sin internet)',
};
export const nombreProveedorIA = (proveedor: string) => NOMBRES_PROVEEDOR[proveedor] ?? proveedor;

export interface Resumen {
  titulo: string;
  ideasClave: string[];
  secciones: { titulo: string; contenido: string }[];
}

// ---------- Cuestionarios ----------

export type TipoPregunta = 'opcion_multiple' | 'completar_seleccion' | 'completar_escrito';

export const HUECO = '___';

// Así llega al front: sin la respuesta correcta ni la explicación (se ven recién al corregir).
export interface PreguntaParaResolver {
  tipo: TipoPregunta;
  enunciado: string;
  opciones: string[];
  tema: string;
}

export interface CuestionarioParaResolver {
  titulo: string;
  preguntas: PreguntaParaResolver[];
}

// Índice de la opción elegida, texto escrito o null si quedó en blanco.
export type RespuestaUsuario = number | string | null;

export interface PreguntaCorregida extends PreguntaParaResolver {
  respuestaUsuario: RespuestaUsuario;
  correcta: boolean;
  respuestaCorrecta: string;
  explicacion: string;
}

export interface TemaAReforzar {
  tema: string;
  errores: number;
  total: number;
}

export interface ResultadoCuestionario {
  idIntento: number;
  preguntas: PreguntaCorregida[];
  correctas: number;
  total: number;
  temasAReforzar: TemaAReforzar[];
}

export interface IntentoCuestionario {
  idIntento: number;
  idMaterialIA: number;
  respuestas: RespuestaUsuario[];
  correctas: number;
  total: number;
  temasAReforzar: TemaAReforzar[];
  fecha: string;
}

// ---------- Mapas mentales ----------

export interface NodoMapa {
  id: string;
  texto: string;
  padreId: string | null;
}

export interface MapaMental {
  titulo: string;
  nodos: NodoMapa[];
}

// ---------- Material guardado ----------

// Resúmenes y mapas se revisan en la pantalla previa; los cuestionarios no (se verían las respuestas).
export interface ContenidoPorTipo {
  resumen: Resumen;
  cuestionario: CuestionarioParaResolver;
  mapaMental: MapaMental;
}

export type ContenidoIA = ContenidoPorTipo[TipoMaterialIA];

export interface PropuestaIA {
  trabajoId: string;
  idArchivo: number;
  fuente: string;
  tipo: TipoMaterialIA;
  contenido: ContenidoIA;
  proveedores: string[];
  // Solo en cuestionarios: ya quedó guardado y se abre para resolver.
  idMaterialIA?: number;
}

export interface MaterialIA {
  idMaterialIA: number;
  idUsuario: number;
  idArchivo: number | null;
  nombreArchivo: string | null;
  tipo: TipoMaterialIA;
  titulo: string;
  contenido: ContenidoIA;
  proveedores: string[];
  fechaCreacion: string;
}

// Evento 'ia:progreso' de la cola de IA (una sola cola para toda la IA).
export interface ProgresoIA {
  id: string;
  estado: 'en_cola' | 'ejecutando' | 'terminado' | 'cancelado' | 'error';
  hechas?: number;
  total?: number;
}

export type RespuestaResumenDocumento =
  | { ok: true; trabajoId: string; nombreArchivo: string; html: string; proveedores: string[] }
  | { ok: false; cancelado: true };

export interface MaterialIAApi {
  generarMaterialIA(datos: { trabajoId: string; idArchivo: number; tipo: TipoMaterialIA; preferencias?: string }):
    Promise<{ ok: true; propuesta: PropuestaIA } | { ok: false; cancelado: true }>;
  descartarMaterialIA(datos: { trabajoId: string }): Promise<boolean>;
  guardarMaterialIA(datos: { trabajoId: string; contenido: ContenidoIA }): Promise<MaterialIA>;
  listarMaterialesIA(datos?: { idArchivo?: number; tipo?: TipoMaterialIA }): Promise<MaterialIA[]>;
  obtenerMaterialIA(datos: { idMaterialIA: number }): Promise<MaterialIA>;
  eliminarMaterialIA(datos: { idMaterialIA: number }): Promise<boolean>;
  responderCuestionario(datos: { idMaterialIA: number; respuestas: RespuestaUsuario[] }): Promise<ResultadoCuestionario>;
  listarIntentosCuestionario(datos: { idMaterialIA: number }): Promise<IntentoCuestionario[]>;
  // Guarda un mapa mental editado (se valida en el main con el mismo esquema que usa la IA).
  editarMapaMental(datos: { idMaterialIA: number; contenido: MapaMental }): Promise<MaterialIA>;
  // Resúmenes como documento editable que se guarda como Word en Material › "Resúmenes".
  generarResumenDocumento(datos: { trabajoId: string; idArchivo: number; indicaciones?: string }): Promise<RespuestaResumenDocumento>;
  guardarResumenDocumento(datos: { trabajosIds?: string[]; nombre: string; html: string }): Promise<{ ok: true; archivo: { id: number; nombre: string } }>;
  // De la API general de IA (cola): los que usa el front de Material con IA.
  cancelar(idTrabajo: string): Promise<boolean>;
  onProgreso(callback: (progreso: ProgresoIA) => void): () => void;
}
