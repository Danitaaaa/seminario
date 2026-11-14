import type { ContenidoIA } from '../../logicaNoPersistente/ia/esquemas';
import type { TipoMaterialIA } from '../../logicaNoPersistente/ia/tipos';
import type { RespuestaUsuario, TemaAReforzar } from './corregirCuestionario';

export interface MaterialIA {
  idMaterialIA: number;
  idUsuario: number;
  idArchivo: number | null;
  // Nombre del archivo de Material del que salió (null si ese archivo se borró).
  nombreArchivo: string | null;
  tipo: TipoMaterialIA;
  titulo: string;
  contenido: ContenidoIA;
  // Qué IA respondió (lo informa el router).
  proveedores: string[];
  fechaCreacion: Date;
}

// Lo que devuelve la IA: resúmenes y mapas van a la pantalla previa antes de guardarse.
export interface PropuestaIA {
  trabajoId: string;
  idArchivo: number;
  fuente: string;
  tipo: TipoMaterialIA;
  contenido: ContenidoIA;
  proveedores: string[];
  // Solo en cuestionarios: ya quedó guardado (no pasan por la pantalla previa).
  idMaterialIA?: number;
}

// Una vez que se resolvió un cuestionario.
export interface IntentoCuestionario {
  idIntento: number;
  idMaterialIA: number;
  respuestas: RespuestaUsuario[];
  correctas: number;
  total: number;
  temasAReforzar: TemaAReforzar[];
  fecha: Date;
}
