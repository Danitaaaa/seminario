import type { Nodo } from '../../types/nodo';

// Datos únicamente para poder ver la pantalla mientras no está conectada al backend.
// Asume que types/nodo.ts expone Nodo con tamaño: number y nodoPadre: number | null
// (ver ajuste sugerido para entidades.ts). Al integrar, este archivo se borra y
// NodoPage recibe los nodos reales (por ejemplo desde el hook useNodos).
export const nodosEjemplo: Nodo[] = [
    { id: 1, nombre: 'Álgebra lineal', fechaDeCarga: '2026-03-02', ultimaFechaAcceso: '2026-09-20', ultimaFechaModificacion: '2026-08-15', tamaño: 0, nodoPadre: null },
    { id: 2, nombre: 'Estructuras de datos', fechaDeCarga: '2026-02-18', ultimaFechaAcceso: '2026-09-22', ultimaFechaModificacion: '2026-09-01', tamaño: 0, nodoPadre: null },
    { id: 3, nombre: 'Bases de datos', fechaDeCarga: '2026-01-10', ultimaFechaAcceso: '2026-09-10', ultimaFechaModificacion: '2026-07-30', tamaño: 0, nodoPadre: null },
    { id: 4, nombre: 'Redes', fechaDeCarga: '2026-04-05', ultimaFechaAcceso: '2026-09-24', ultimaFechaModificacion: '2026-09-24', tamaño: 0, nodoPadre: null },
    { id: 5, nombre: 'Sistemas operativos', fechaDeCarga: '2026-05-12', ultimaFechaAcceso: '2026-08-30', ultimaFechaModificacion: '2026-08-29', tamaño: 0, nodoPadre: null },
    { id: 6, nombre: 'Análisis matemático', fechaDeCarga: '2026-03-28', ultimaFechaAcceso: '2026-09-05', ultimaFechaModificacion: '2026-06-11', tamaño: 0, nodoPadre: null },
];
