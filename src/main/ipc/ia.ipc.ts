// src/main/ipc/ia.ipc.ts
import { ipcMain } from 'electron';
import {
  generarSchema,
  guardarClaveSchema,
  idTrabajoSchema,
  proveedorCualquieraSchema,
  proveedorOnlineSchema,
} from '../logicaNoPersistente/ia/dto.js';
import type { ServicioIA } from '../logicaNoPersistente/ia/servicioIA.js';
import { z } from 'zod';
/** Los Error NO viajan bien por IPC (se pierden propiedades): siempre devolvemos un objeto simple. */
type Resp<T> = { ok: true; dato: T } | { ok: false; causa: string; mensaje: string };

const fallo = (causa: string, e: unknown): Resp<never> => ({
  ok: false,
  causa,
  mensaje: e instanceof Error ? e.message : String(e),
});

export function registrarIpcIA(servicio: ServicioIA): void {
  // Generar y cancelar
  ipcMain.handle('ia:generar', async (_e, datos: unknown) => {
    const validado = generarSchema.safeParse(datos);
    if (!validado.success) return fallo('pedido_invalido', validado.error);
    return servicio.generar(validado.data);
  });
  ipcMain.handle('ia:cancelar', (_e, id: unknown) => servicio.cancelar(idTrabajoSchema.parse(id)));

  // Claves
  ipcMain.handle('ia:guardarClave', (_e, proveedor: unknown, clave: unknown) => {
    const validado = guardarClaveSchema.safeParse({ proveedor, clave });
    if (!validado.success) return fallo('pedido_invalido', validado.error);
    return servicio.guardarClave(validado.data.proveedor, validado.data.clave);
  });
  ipcMain.handle('ia:tieneClave', (_e, proveedor: unknown) => servicio.tieneClave(proveedorOnlineSchema.parse(proveedor)));
  ipcMain.handle('ia:claveEnmascarada', (_e, proveedor: unknown) =>
    servicio.claveEnmascarada(proveedorOnlineSchema.parse(proveedor)),
  );
  ipcMain.handle('ia:borrarClave', (_e, proveedor: unknown) => servicio.borrarClave(proveedorOnlineSchema.parse(proveedor)));

  // Pantalla de Ajustes
  ipcMain.handle('ia:probarConexion', (_e, proveedor: unknown) =>
    servicio.probarConexion(proveedorCualquieraSchema.parse(proveedor)),
  );
  ipcMain.handle('ia:estadoOllama', () => servicio.estadoOllama());

  // Ollama
  ipcMain.handle('ia:ollama:ultimo', () => servicio.ollamaUltimo());
  ipcMain.handle('ia:ollama:descargar', () => servicio.ollamaDescargar());
  ipcMain.handle('ia:ollama:cancelar', () => servicio.ollamaCancelar());
  ipcMain.handle('ia:ollama:reintentar', () => servicio.ollamaReintentar());
}