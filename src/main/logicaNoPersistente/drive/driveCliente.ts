const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const POWERPOINT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Formato del archivo que se sube a Drive.
export const MIME_SUBIDA: Record<string, string> = {
  docx: WORD,
  xlsx: EXCEL,
  pptx: POWERPOINT,
  dotx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  xltx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
  potx: 'application/vnd.openxmlformats-officedocument.presentationml.template',
};

// Editor de Google al que Drive convierte cada formato.
export const MIME_GOOGLE: Record<string, string> = {
  docx: 'application/vnd.google-apps.document',
  dotx: 'application/vnd.google-apps.document',
  xlsx: 'application/vnd.google-apps.spreadsheet',
  xltx: 'application/vnd.google-apps.spreadsheet',
  pptx: 'application/vnd.google-apps.presentation',
  potx: 'application/vnd.google-apps.presentation',
};

// Formato en que Drive lo devuelve. Las plantillas vuelven como documento común
// y plantillaOffice.ts las convierte otra vez en plantilla.
export const MIME_EXPORTACION: Record<string, string> = {
  docx: WORD,
  dotx: WORD,
  xlsx: EXCEL,
  xltx: EXCEL,
  pptx: POWERPOINT,
  potx: POWERPOINT,
};

export const MENSAJE_FORMATOS =
  'Google Docs funciona con archivos de Word (.docx, .dotx), Excel (.xlsx, .xltx) y PowerPoint (.pptx, .potx).';

const BASE_API = 'https://www.googleapis.com';

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface ArchivoDrive {
  id: string;
  webViewLink: string;
}

// Cliente mínimo de la API de Drive. No guarda nada: el token lo entrega quien lo usa.
export class DriveCliente {
  constructor(
    private readonly obtenerToken: () => Promise<string>,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  // Sube el archivo y Drive lo convierte a Google Docs, Sheets o Slides.
  async subirComoGoogle(nombre: string, extension: string, contenido: Buffer): Promise<ArchivoDrive> {
    const ext = this.extensionSoportada(extension);
    const metadata = { name: `${nombre}.${ext}`, mimeType: MIME_GOOGLE[ext] };
    const limite = `syntra-${Date.now()}`;

    const cuerpo = Buffer.concat([
      Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      Buffer.from(`--${limite}\r\nContent-Type: ${MIME_SUBIDA[ext]}\r\n\r\n`),
      contenido,
      Buffer.from(`\r\n--${limite}--`),
    ]);

    const respuesta = await this.pedir(
      `${BASE_API}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
        body: new Uint8Array(cuerpo),
      },
    );
    return (await respuesta.json()) as ArchivoDrive;
  }

  // Trae la versión actual del archivo de Drive como documento de Office.
  async descargarComoOffice(driveId: string, extension: string): Promise<Buffer> {
    const ext = this.extensionSoportada(extension);
    const mime = encodeURIComponent(MIME_EXPORTACION[ext]);
    const url = `${BASE_API}/drive/v3/files/${encodeURIComponent(driveId)}/export?mimeType=${mime}`;
    const respuesta = await this.pedir(url);
    return Buffer.from(await respuesta.arrayBuffer());
  }

  private extensionSoportada(extension: string): string {
    const ext = extension.toLowerCase();
    if (!MIME_GOOGLE[ext]) throw new Error(MENSAJE_FORMATOS);
    return ext;
  }

  private async pedir(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.obtenerToken();
    const cabeceras = { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` };
    const respuesta = await this.fetchFn(url, { ...init, headers: cabeceras });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      throw new Error(`Google Drive respondió ${respuesta.status}: ${detalle.slice(0, 200)}`);
    }
    return respuesta;
  }
}