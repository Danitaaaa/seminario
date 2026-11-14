// src/main/logicaPersistente/gestionDeMaterialIA/guardarGuiaPreguntas.ts
// Guarda la guía de preguntas ya corregida como un .docx dentro de Material, siempre en la carpeta "guia"
// (bajo la raíz), que se crea si no existe. La lógica es la misma que la de los resúmenes: GuardarDocumentoIA.
import { Archivos } from '../../administracionDePersistencia/archivos';
import { Nodos } from '../../administracionDePersistencia/nodo';
import { Persistencia } from '../../persistencia/persistencia';
import { GuardarDocumentoIA, type DatosDocumentoIA } from './guardarDocumentoIA';

// Tiene que coincidir con guiaPreguntasPage.tsx.
const NOMBRE_CARPETA_GUIAS = 'guia';

export type DatosGuardarGuia = DatosDocumentoIA;

export class GuardarGuiaPreguntas extends GuardarDocumentoIA {
  constructor(archivos: Archivos, nodos: Nodos, persistencia: Persistencia) {
    super(archivos, nodos, persistencia, NOMBRE_CARPETA_GUIAS, 'Guía de preguntas');
  }
}
