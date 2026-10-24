import { ipcMain } from 'electron';
import { ZodType } from 'zod';
import { SesionesEstudio } from '../administracionDePersistencia/sesionesEstudio';
import { ProcesoSesionEstudio } from '../logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import { SesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/entidades';
import {
  actualizarObjetivoSchema,
  agregarObjetivoSchema,
  cambiarFasePomodoroSchema,
  crearPestanaSchema,
  crearSesionEstudioSchema,
  guardarContenidoSesionSchema,
  idObjetivoSchema,
  idPestanaSchema,
  idSesionSchema,
  listarSesionesEstudioSchema,
  modificarSesionEstudioSchema,
  registrarMateriaSchema,
  renombrarPestanaSchema,
  resumenSesionesSchema,
  usuarioIdSchema,
} from '../logicaPersistente/gestionDeSesionEstudio/dto';

// Pasa las fechas a string para que lleguen al renderer como las describen los tipos espejo.
function aTransportable<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor ?? null));
}

// Valida el usuario y los datos de la acción; el usuarioId viaja en el DTO, como en el resto de los módulos.
function validar<T>(esquema: ZodType<T>, datos: unknown): { usuarioId: number; datos: T } {
  const { usuarioId } = usuarioIdSchema.parse(datos);
  return { usuarioId, datos: esquema.parse(datos) };
}

// Registra los handlers IPC del módulo. Cada uno valida con Zod antes de tocar la lógica.
export function registerSesionesEstudioIpc(
  sesiones: SesionesEstudio,
  proceso: ProcesoSesionEstudio
): void {
  // Las acciones que cambian el reloj (iniciar, pausar, Pomodoro...) refrescan lo que sigue el proceso.
  const seguir = (sesion: SesionEstudio) => {
    proceso.seguir(sesion);
    return aTransportable(sesion);
  };

  // Registra un handler que recibe { usuarioId, idSesion } y devuelve la sesión actualizada.
  const accionSobreSesion = (
    canal: string,
    accion: (usuarioId: number, idSesion: number) => Promise<SesionEstudio>
  ) => {
    ipcMain.handle(canal, async (_event, datos: unknown) => {
      const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
      return seguir(await accion(usuarioId, idSesion));
    });
  };

  ipcMain.handle('sesionesEstudio:crear', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(crearSesionEstudioSchema, datos);
    return aTransportable(await sesiones.crear(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:listar', async (_event, filtros: unknown) => {
    const { usuarioId, datos: validado } = validar(listarSesionesEstudioSchema, filtros);
    return aTransportable(await sesiones.listar(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:abrir', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    return aTransportable(await sesiones.abrir(usuarioId, idSesion));
  });

  accionSobreSesion('sesionesEstudio:iniciar', (u, id) => sesiones.iniciar(u, id));
  accionSobreSesion('sesionesEstudio:pausar', (u, id) => sesiones.pausar(u, id));
  accionSobreSesion('sesionesEstudio:reanudar', (u, id) => sesiones.reanudar(u, id));

  ipcMain.handle('sesionesEstudio:finalizar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    const sesion = await sesiones.finalizar(usuarioId, idSesion);
    proceso.dejarDeSeguir();
    return aTransportable(sesion);
  });

  ipcMain.handle('sesionesEstudio:modificar', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(modificarSesionEstudioSchema, datos);
    return seguir(await sesiones.modificar(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:eliminar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    await sesiones.eliminar(usuarioId, idSesion);
  });

  // ---- Pestañas del editor ----

  ipcMain.handle('sesionesEstudio:pestanas', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    return aTransportable(await sesiones.listarPestanas(usuarioId, idSesion));
  });

  ipcMain.handle('sesionesEstudio:pestanaCrear', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(crearPestanaSchema, datos);
    return aTransportable(await sesiones.crearPestana(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:pestanaRenombrar', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(renombrarPestanaSchema, datos);
    return aTransportable(await sesiones.renombrarPestana(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:pestanaEliminar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idPestana } } = validar(idPestanaSchema, datos);
    await sesiones.eliminarPestana(usuarioId, idPestana);
  });

  // Guarda la pestaña en la sesión y actualiza su Word de Material.
  ipcMain.handle('sesionesEstudio:guardarContenido', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(guardarContenidoSesionSchema, datos);
    return aTransportable(await sesiones.guardarContenido(usuarioId, validado));
  });

  // ---- Objetivos ----

  ipcMain.handle('sesionesEstudio:objetivoAgregar', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(agregarObjetivoSchema, datos);
    return aTransportable(await sesiones.agregarObjetivo(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:objetivoActualizar', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(actualizarObjetivoSchema, datos);
    return aTransportable(await sesiones.actualizarObjetivo(usuarioId, validado));
  });

  ipcMain.handle('sesionesEstudio:objetivoEliminar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idObjetivo } } = validar(idObjetivoSchema, datos);
    await sesiones.eliminarObjetivo(usuarioId, idObjetivo);
  });

  // ---- Pomodoro ----

  accionSobreSesion('sesionesEstudio:pomodoroIniciar', (u, id) => sesiones.iniciarPomodoro(u, id));
  accionSobreSesion('sesionesEstudio:pomodoroPausar', (u, id) => sesiones.pausarPomodoro(u, id));
  accionSobreSesion('sesionesEstudio:pomodoroReiniciar', (u, id) => sesiones.reiniciarPomodoro(u, id));

  ipcMain.handle('sesionesEstudio:pomodoroFase', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(cambiarFasePomodoroSchema, datos);
    return seguir(await sesiones.cambiarFasePomodoro(usuarioId, validado.idSesion, validado.fase));
  });

  // ---- Materias y resumen ----

  ipcMain.handle('sesionesEstudio:opciones', async () => {
    return aTransportable(await sesiones.listarOpciones());
  });

  ipcMain.handle('sesionesEstudio:registrarMateria', async (_event, datos: unknown) => {
    const validado = registrarMateriaSchema.parse(datos);
    return aTransportable(await sesiones.registrarMateria(validado));
  });

  ipcMain.handle('sesionesEstudio:resumen', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(resumenSesionesSchema, datos);
    return aTransportable(await sesiones.obtenerResumen(usuarioId, validado));
  });

  // El renderer lo llama al montarse: si hay una sesión en curso, el proceso la retoma y devuelve su estado.
  ipcMain.handle('sesionesEstudio:enCurso', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSchema.parse(datos);
    const sesion = await sesiones.obtenerSesionEnCurso(usuarioId);
    if (sesion) proceso.seguir(sesion);
    return aTransportable({ sesion, snapshot: proceso.obtenerSnapshot() });
  });
}
