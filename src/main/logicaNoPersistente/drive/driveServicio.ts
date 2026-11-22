import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Archivos } from '../../administracionDePersistencia/archivos';
import type { Archivo } from '../../logicaPersistente/gestionMaterialEstudio/entidades';
import type { Almacenamiento } from '../../persistencia/almacenamiento';
import type { DriveCliente } from './driveCliente';
import { aPlantilla } from './plantillaOffice';

// Sección del editor de Google para cada formato.
const SECCION_EDITOR: Record<string, string> = {
  docx: 'document',
  dotx: 'document',
  xlsx: 'spreadsheets',
  xltx: 'spreadsheets',
  pptx: 'presentation',
  potx: 'presentation',
};

export function enlaceDe(driveId: string, extension: string): string {
  const seccion = SECCION_EDITOR[extension.toLowerCase()] ?? 'document';
  return `https://docs.google.com/${seccion}/d/${driveId}/edit`;
}

// De qué lado se quiere conservar el documento cuando cambió en Syntra y en Google.
export type LadoDrive = 'syntra' | 'google';
// Qué cambió desde la última sincronización.
export type CambiosDrive = 'ninguno' | 'syntra' | 'google' | 'ambos';
export type ResultadoAbrirDrive = 'abierto' | 'conflicto';
export type ResultadoRevisarDrive = 'nada' | 'traido' | 'conflicto';

// Une el archivo local con su copia en Drive y la mantiene al día en los dos sentidos:
// - al abrir en Google, si el archivo cambió en Syntra, primero sube la versión nueva;
// - al abrir en Syntra, si cambió en Google, trae esa versión;
// - si cambió en los dos lados, no pisa nada: devuelve 'conflicto' para que la persona elija.
export class DriveServicio {
  constructor(
    private readonly drive: DriveCliente,
    private readonly archivos: Archivos,
    private readonly almacenamiento: Almacenamiento,
    private readonly abrirEnlace: (url: string) => Promise<void>,
    // Cliente que no abre el inicio de sesión de Google: lo usa la revisión automática al abrir un archivo.
    private readonly driveSinLogin: DriveCliente = drive,
  ) {}

  async abrirEnDrive(id: number, conservar?: LadoDrive): Promise<ResultadoAbrirDrive> {
    const archivo = await this.archivos.obtener({ id });

    if (!archivo.driveId) {
      const contenido = await this.leer(archivo);
      const subido = await this.drive.subirComoGoogle(archivo.nombre, archivo.extension, contenido);
      const modificado = subido.modifiedTime ?? await this.drive.ultimaModificacion(subido.id);
      await this.archivos.guardarDrive(id, subido.id, { huella: huella(contenido), modificado });
      await this.abrirEnlace(subido.webViewLink);
      return 'abierto';
    }

    const { cambios, modificado } = await this.cambios(archivo, this.drive);
    if (cambios === 'ambos' && !conservar) return 'conflicto';

    if (cambios === 'syntra' || (cambios === 'ambos' && conservar === 'syntra')) {
      await this.subirCambios(archivo);
    } else if (cambios === 'ambos' && conservar === 'google') {
      await this.traer(archivo, this.drive, modificado);
    }
    await this.abrirEnlace(enlaceDe(archivo.driveId, archivo.extension));
    return 'abierto';
  }

  // Al abrir el archivo en Syntra: si se editó en Google, se trae esa versión.
  // Sin `conservar` no abre el inicio de sesión de Google: si no hay permiso o internet, no hace nada.
  async revisarAlAbrir(id: number, conservar?: LadoDrive): Promise<ResultadoRevisarDrive> {
    const archivo = await this.archivos.obtener({ id });
    if (!archivo.driveId) return 'nada';
    const cliente = conservar ? this.drive : this.driveSinLogin;

    let cambios: CambiosDrive;
    let modificado: string;
    try {
      ({ cambios, modificado } = await this.cambios(archivo, cliente));
    } catch (error) {
      if (conservar) throw error;
      console.warn('[Drive] No se pudo revisar si hubo cambios en Google:', error);
      return 'nada';
    }

    if (cambios === 'google' || (cambios === 'ambos' && conservar === 'google')) {
      await this.traer(archivo, cliente, modificado);
      return 'traido';
    }
    if (cambios === 'ambos') {
      if (!conservar) return 'conflicto';
      await this.subirCambios(archivo);
    }
    return 'nada';
  }

  // Reemplaza el archivo local por la versión que hay hoy en Drive (botón "Traer versión de Google Drive").
  async traerVersion(id: number): Promise<void> {
    const archivo = await this.archivos.obtener({ id });
    if (!archivo.driveId) {
      throw new Error('Este archivo todavía no se subió a Google Drive.');
    }
    await this.traer(archivo, this.drive, await this.drive.ultimaModificacion(archivo.driveId));
  }

  // Compara el archivo y Drive con lo anotado en la última sincronización.
  // Un archivo subido antes de que existiera este registro cuenta como cambiado en los dos lados.
  private async cambios(archivo: Archivo, cliente: DriveCliente): Promise<{ cambios: CambiosDrive; modificado: string }> {
    const modificado = await cliente.ultimaModificacion(archivo.driveId!);
    const enSyntra = archivo.driveHuella !== huella(await this.leer(archivo));
    const enGoogle = archivo.driveModificado !== modificado;
    const cambios: CambiosDrive = enSyntra && enGoogle ? 'ambos' : enSyntra ? 'syntra' : enGoogle ? 'google' : 'ninguno';
    return { cambios, modificado };
  }

  private async subirCambios(archivo: Archivo): Promise<void> {
    const contenido = await this.leer(archivo);
    const modificado = await this.drive.actualizarContenido(archivo.driveId!, archivo.extension, contenido);
    await this.archivos.guardarDrive(archivo.id, archivo.driveId, { huella: huella(contenido), modificado });
  }

  // `modificado` es la fecha de Drive leída antes de descargar: si alguien edita mientras tanto, la próxima vez se vuelve a traer.
  private async traer(archivo: Archivo, cliente: DriveCliente, modificado: string): Promise<void> {
    const descargado = await cliente.descargarComoOffice(archivo.driveId!, archivo.extension);
    const contenido = await aPlantilla(descargado, archivo.extension);
    const temporal = path.join(os.tmpdir(), `syntra-${Date.now()}.${archivo.extension}`);
    await fs.promises.writeFile(temporal, contenido);
    try {
      await this.almacenamiento.reemplazar(archivo.rutaFisica, temporal);
    } finally {
      await fs.promises.rm(temporal, { force: true });
    }
    await this.archivos.guardarDrive(archivo.id, archivo.driveId, { huella: huella(contenido), modificado });
  }

  private leer(archivo: Archivo): Promise<Buffer> {
    return fs.promises.readFile(this.almacenamiento.rutaCompleta(archivo.rutaFisica));
  }
}

function huella(contenido: Buffer): string {
  return createHash('sha256').update(contenido).digest('hex');
}
