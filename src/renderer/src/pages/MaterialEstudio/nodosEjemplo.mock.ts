import type { Nodo } from '../../types/nodo';

// Datos únicamente para poder ver la pantalla mientras no está conectada al backend.
// Incluye carpetas y archivos para poder probar selección y "mover" en la UI.
// Al integrar, este archivo se borra y NodoPage recibe los nodos reales
// (por ejemplo desde el hook useNodos).
export const nodosEjemplo: Nodo[] = [
    { id: 1, tipo: 'carpeta', nombre: 'Álgebra lineal', fechaDeCarga: '2026-03-02', ultimaFechaAcceso: '2026-09-20', ultimaFechaModificacion: '2026-08-15', tamaño: '0', nodoPadre: null },
    { id: 2, tipo: 'carpeta', nombre: 'Estructuras de datos', fechaDeCarga: '2026-02-18', ultimaFechaAcceso: '2026-09-22', ultimaFechaModificacion: '2026-09-01', tamaño: '0', nodoPadre: 1 },
    { id: 3, tipo: 'carpeta', nombre: 'Bases de datos', fechaDeCarga: '2026-01-10', ultimaFechaAcceso: '2026-09-10', ultimaFechaModificacion: '2026-07-30', tamaño: '0', nodoPadre: null },
    { id: 4, tipo: 'carpeta', nombre: 'Redes', fechaDeCarga: '2026-04-05', ultimaFechaAcceso: '2026-09-24', ultimaFechaModificacion: '2026-09-24', tamaño: '0', nodoPadre: null },
    { id: 5, tipo: 'carpeta', nombre: 'Sistemas operativos', fechaDeCarga: '2026-05-12', ultimaFechaAcceso: '2026-08-30', ultimaFechaModificacion: '2026-08-29', tamaño: '0', nodoPadre: null },
    { id: 6, tipo: 'carpeta', nombre: 'Análisis matemático', fechaDeCarga: '2026-03-28', ultimaFechaAcceso: '2026-09-05', ultimaFechaModificacion: '2026-06-11', tamaño: '0', nodoPadre: null },
    { id: 7, tipo: 'archivo', extension: 'pdf', nombre: 'Apunte transformadas lineales.pdf', fechaDeCarga: '2026-03-05', ultimaFechaAcceso: '2026-09-18', ultimaFechaModificacion: '2026-03-05', tamaño: '2457600', nodoPadre: null },
    { id: 8, tipo: 'archivo', extension: 'docx', nombre: 'Resumen árboles balanceados.docx', fechaDeCarga: '2026-02-20', ultimaFechaAcceso: '2026-09-19', ultimaFechaModificacion: '2026-06-01', tamaño: '184320', nodoPadre: null },
    { id: 9, tipo: 'archivo', extension: 'xlsx', nombre: 'Comparativa motores de bases de datos.xlsx', fechaDeCarga: '2026-01-15', ultimaFechaAcceso: '2026-09-11', ultimaFechaModificacion: '2026-08-02', tamaño: '92160', nodoPadre: null },
    { id: 10, tipo: 'archivo', extension: 'png', nombre: 'Diagrama topología de red.png', fechaDeCarga: '2026-04-10', ultimaFechaAcceso: '2026-09-24', ultimaFechaModificacion: '2026-04-10', tamaño: '512000', nodoPadre: null },
];