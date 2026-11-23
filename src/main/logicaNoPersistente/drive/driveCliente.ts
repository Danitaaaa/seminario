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
  modifiedTime?: string;
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
      `${BASE_API}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,modifiedTime`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
        body: new Uint8Array(cuerpo),
      },
    );
    return (await respuesta.json()) as ArchivoDrive;
  }

  // Reemplaza el contenido del documento que ya está en Drive (mismo ID y mismo enlace).
  // Drive lo vuelve a convertir a Google Docs, Sheets o Slides. Devuelve la nueva fecha de modificación.
  async actualizarContenido(driveId: string, extension: string, contenido: Buffer): Promise<string> {
    const ext = this.extensionSoportada(extension);
    const respuesta = await this.pedir(
      `${BASE_API}/upload/drive/v3/files/${encodeURIComponent(driveId)}?uploadType=media&fields=modifiedTime`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': MIME_SUBIDA[ext] },
        body: new Uint8Array(contenido),
      },
    );
    return ((await respuesta.json()) as { modifiedTime: string }).modifiedTime;
  }

  // Fecha de la última modificación del documento en Drive (cambia cuando alguien lo edita en Google).
  async ultimaModificacion(driveId: string): Promise<string> {
    const respuesta = await this.pedir(`${BASE_API}/drive/v3/files/${encodeURIComponent(driveId)}?fields=modifiedTime`);
    return ((await respuesta.json()) as { modifiedTime: string }).modifiedTime;
  }

  // Trae la versión actual del archivo de Drive como documento de Office.
  async descargarComoOffice(driveId: string, extension: string): Promise<Buffer> {
    const ext = this.extensionSoportada(extension);
    const mime = encodeURIComponent(MIME_EXPORTACION[ext]);
    const archivo = `${BASE_API}/drive/v3/files/${encodeURIComponent(driveId)}`;
    try {
      const respuesta = await this.pedir(`${archivo}/export?mimeType=${mime}`);
      return Buffer.from(await respuesta.arrayBuffer());
    } catch (error) {
      // La exportación directa tiene un límite de 10 MB; los enlaces de exportación del archivo no.
      if (!(error instanceof Error && /too large to be exported/i.test(error.message))) throw error;
      const datos = await (await this.pedir(`${archivo}?fields=exportLinks`)).json() as { exportLinks?: Record<string, string> };
      const enlace = datos.exportLinks?.[MIME_EXPORTACION[ext]];
      if (!enlace) throw new Error('El archivo es demasiado grande para traerlo desde Google Drive.');
      const respuesta = await this.pedir(enlace);
      return Buffer.from(await respuesta.arrayBuffer());
    }
  }

  /* ---------- Copias de seguridad (archivos .syntra en una carpeta propia de Syntra) ---------- */

  // Busca la carpeta de las copias; si no está, la crea. Syntra solo ve lo que creó ella (drive.file).
  async carpetaCopias(nombre: string): Promise<string> {
    const q = `name = '${nombre.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const lista = await (await this.pedir(`${BASE_API}/drive/v3/files?${new URLSearchParams({ q, fields: 'files(id)', spaces: 'drive' })}`)).json() as { files?: { id: string }[] };
    if (lista.files?.[0]) return lista.files[0].id;
    const creada = await (await this.pedir(`${BASE_API}/drive/v3/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.folder' }),
    })).json() as { id: string };
    return creada.id;
  }

  // Subida "reanudable": sirve para archivos grandes (la común se corta en 5 MB).
  async subirCopia(idCarpeta: string, nombre: string, contenido: Buffer): Promise<string> {
    const inicio = await this.pedir(`${BASE_API}/upload/drive/v3/files?uploadType=resumable&fields=id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/octet-stream',
        'X-Upload-Content-Length': String(contenido.length),
      },
      body: JSON.stringify({ name: nombre, parents: [idCarpeta], mimeType: 'application/octet-stream' }),
    });
    const sesion = inicio.headers.get('location');
    if (!sesion?.startsWith(`${BASE_API}/upload/`)) throw new Error('Google Drive no aceptó la subida de la copia.');
    const subida = await (await this.pedir(sesion, { method: 'PUT', body: new Uint8Array(contenido) })).json() as { id: string };
    return subida.id;
  }

  async listarCopias(idCarpeta: string): Promise<{ id: string; nombre: string; tamanio: number; fecha: string }[]> {
    const parametros = new URLSearchParams({
      q: `'${idCarpeta}' in parents and trashed = false`,
      orderBy: 'createdTime desc',
      fields: 'files(id,name,size,createdTime)',
      pageSize: '50',
    });
    const datos = await (await this.pedir(`${BASE_API}/drive/v3/files?${parametros}`)).json() as {
      files?: { id: string; name: string; size?: string; createdTime: string }[];
    };
    return (datos.files ?? []).map((f) => ({ id: f.id, nombre: f.name, tamanio: Number(f.size ?? 0), fecha: f.createdTime }));
  }

  async descargarCopia(id: string): Promise<Buffer> {
    const respuesta = await this.pedir(`${BASE_API}/drive/v3/files/${encodeURIComponent(id)}?alt=media`);
    return Buffer.from(await respuesta.arrayBuffer());
  }

  async borrarCopia(id: string): Promise<void> {
    await this.pedir(`${BASE_API}/drive/v3/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
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