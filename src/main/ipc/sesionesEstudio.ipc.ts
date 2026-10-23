import { ipcMain } from 'electron';
import { ZodType } from 'zod';
import { SesionesEstudio } from '../administracionDePersistencia/sesionesEstudio';
import { ProcesoSesionEstudio } from '../logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import {
  actualizarObjetivoSchema,
  guardarContenidoSesionSchema,
  usuarioIdSchema,
  agregarObjetivoSchema,
  crearSesionEstudioSchema,
  idObjetivoSchema,
  idSesionSchema,
  listarSesionesEstudioSchema,
  modificarSesionEstudioSchema,
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

  ipcMain.handle('sesionesEstudio:iniciar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    const sesion = await sesiones.iniciar(usuarioId, idSesion);
    proceso.seguir(sesion);
    return aTransportable(sesion);
  });

  ipcMain.handle('sesionesEstudio:finalizar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    const sesion = await sesiones.finalizar(usuarioId, idSesion);
    proceso.dejarDeSeguir();
    return aTransportable(sesion);
  });

  ipcMain.handle('sesionesEstudio:modificar', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(modificarSesionEstudioSchema, datos);
    return aTransportable(await sesiones.modificar(usuarioId, validado));
  });

  // Guarda el contenido del editor en la sesión y en su Word de Material.
  ipcMain.handle('sesionesEstudio:guardarContenido', async (_event, datos: unknown) => {
    const { usuarioId, datos: validado } = validar(guardarContenidoSesionSchema, datos);
    await sesiones.guardarContenido(usuarioId, validado);
  });

  ipcMain.handle('sesionesEstudio:eliminar', async (_event, datos: unknown) => {
    const { usuarioId, datos: { idSesion } } = validar(idSesionSchema, datos);
    await sesiones.eliminar(usuarioId, idSesion);
  });

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

  ipcMain.handle('sesionesEstudio:opciones', async () => {
    return aTransportable(await sesiones.listarOpciones());
  });

  // El renderer lo llama al montarse: si hay una sesión en curso, el proceso la retoma y devuelve su estado.
  ipcMain.handle('sesionesEstudio:enCurso', async (_event, datos: unknown) => {
    const { usuarioId } = usuarioIdSchema.parse(datos);
    const sesion = await sesiones.obtenerSesionEnCurso(usuarioId);
    if (sesion) proceso.seguir(sesion);
    return aTransportable({ sesion, snapshot: proceso.obtenerSnapshot() });
  });
}
