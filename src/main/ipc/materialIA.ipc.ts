import { ipcMain } from 'electron';
import type { MaterialIA } from '../administracionDePersistencia/materialIA';

// Todo lo de IA sobre material de estudio, en un solo archivo: Material con IA (resumen, cuestionario, mapa mental),
// flashcards, guía de preguntas y materias desde el plan de estudio. También ver, eliminar y editar lo guardado,
// y resolver los cuestionarios (se corrigen en el main).
// El IPC no valida ni importa nada de logicaPersistente: pasa los datos a MaterialIA, que los valida con los
// esquemas de logicaNoPersistente/ia/esquemas.ts. El progreso ('ia:progreso') y cancelar ('ia:cancelar') son
// los de toda la IA: hay una sola cola. Los nombres de los canales no cambiaron.
export function registerMaterialIAIpc(materialIA: MaterialIA): void {
  // Material con IA: generar desde un archivo → pantalla previa → guardar.
  ipcMain.handle('materialIA:generar', (_e, datos: unknown) => materialIA.generar(datos));
  ipcMain.handle('materialIA:guardar', (_e, datos: unknown) => materialIA.guardar(datos));
  ipcMain.handle('materialIA:listar', (_e, datos: unknown) => materialIA.listar(datos));
  ipcMain.handle('materialIA:descartar', (_e, datos: unknown) => materialIA.descartar(datos));

  // Flashcards con IA (las tarjetas se revisan en el modal y se guardan por el flujo normal de Flashcards).
  ipcMain.handle('flashcardsIA:generar', (_e, datos: unknown) => materialIA.generarFlashcards(datos));

  // Guía de preguntas: generar → editar → guardar en la carpeta elegida.
  ipcMain.handle('guiaPreguntas:generar', (_e, datos: unknown) => materialIA.generarGuia(datos));
  ipcMain.handle('guiaPreguntas:guardar', (_e, datos: unknown) => materialIA.guardarGuia(datos));

  // Resumen como documento: generar → editar → guardar como Word en Material › "Resúmenes".
  ipcMain.handle('resumenIA:generar', (_e, datos: unknown) => materialIA.generarResumenDocumento(datos));
  ipcMain.handle('resumenIA:guardar', (_e, datos: unknown) => materialIA.guardarResumenDocumento(datos));

  // Lo guardado: ver, eliminar, editar mapas mentales y resolver cuestionarios.
  ipcMain.handle('materialIA:obtener', (_e, datos: unknown) => materialIA.obtener(datos));
  ipcMain.handle('materialIA:eliminar', (_e, datos: unknown) => materialIA.eliminar(datos));
  ipcMain.handle('materialIA:editarMapaMental', (_e, datos: unknown) => materialIA.editarMapaMental(datos));
  ipcMain.handle('materialIA:responderCuestionario', (_e, datos: unknown) => materialIA.responderCuestionario(datos));
  ipcMain.handle('materialIA:listarIntentos', (_e, datos: unknown) => materialIA.listarIntentos(datos));

  // Para cerrar el modal de flashcards o de la guía sin guardar (mismo efecto que materialIA:descartar).
  ipcMain.handle('materialIAExtra:descartar', (_e, datos: unknown) => materialIA.descartar(datos));

  // Materias desde el plan de estudio con IA.
  ipcMain.handle('materias:leerPlanIA', (_e, datos: unknown) => materialIA.leerPlan(datos));
}
