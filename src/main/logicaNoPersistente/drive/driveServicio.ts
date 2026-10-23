import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Archivos } from '../../administracionDePersistencia/archivos';
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

// Une el archivo local con su copia en Drive: la primera vez sube, después solo abre.
export class DriveServicio {
  constructor(
    private readonly drive: DriveCliente,
    private readonly archivos: Archivos,
    private readonly almacenamiento: Almacenamiento,
    private readonly abrirEnlace: (url: string) => Promise<void>,
  ) {}

  async abrirEnDrive(id: number): Promise<void> {
    const archivo = await this.archivos.obtener({ id });

    if (archivo.driveId) {
      await this.abrirEnlace(enlaceDe(archivo.driveId, archivo.extension));
      return;
    }

    const contenido = await fs.promises.readFile(this.almacenamiento.rutaCompleta(archivo.rutaFisica));
    const subido = await this.drive.subirComoGoogle(archivo.nombre, archivo.extension, contenido);
    await this.archivos.guardarDrive(id, subido.id);
    await this.abrirEnlace(subido.webViewLink);
  }

  // Reemplaza el archivo local por la versión que hay hoy en Drive.
  async traerVersion(id: number): Promise<void> {
    const archivo = await this.archivos.obtener({ id });
    if (!archivo.driveId) {
      throw new Error('Este archivo todavía no se subió a Google Drive.');
    }

    const descargado = await this.drive.descargarComoOffice(archivo.driveId, archivo.extension);
    const contenido = await aPlantilla(descargado, archivo.extension);
    const temporal = path.join(os.tmpdir(), `syntra-${Date.now()}.${archivo.extension}`);
    await fs.promises.writeFile(temporal, contenido);
    try {
      await this.almacenamiento.reemplazar(archivo.rutaFisica, temporal);
    } finally {
      await fs.promises.rm(temporal, { force: true });
    }
  }
}