// src/main/logicaPersistente/gestionDeMaterialIA/guardarResumenIA.ts
// Guarda el resumen ya corregido como un .docx dentro de Material, en la carpeta "Resúmenes"
// (bajo la raíz), que se crea si no existe. Igual que la guía de preguntas.
import { Archivos } from '../../administracionDePersistencia/archivos';
import { Nodos } from '../../administracionDePersistencia/nodo';
import { Persistencia } from '../../persistencia/persistencia';
import { GuardarDocumentoIA } from './guardarDocumentoIA';

// Tiene que coincidir con resumenesPage.tsx.
export const NOMBRE_CARPETA_RESUMENES = 'Resúmenes';

export class GuardarResumenIA extends GuardarDocumentoIA {
  constructor(archivos: Archivos, nodos: Nodos, persistencia: Persistencia) {
    super(archivos, nodos, persistencia, NOMBRE_CARPETA_RESUMENES, 'Resumen');
  }
}
