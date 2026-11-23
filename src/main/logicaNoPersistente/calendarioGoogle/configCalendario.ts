import fs from 'node:fs';
import path from 'node:path';
import type { CambioTraido } from '../../logicaPersistente/gestionDeCalendarioGoogle/entidades';

// Lo que se recuerda de la conexión con Google Calendar de cada usuario (en la carpeta de la app).
export interface ConfigCalendario {
  idCalendario: string | null;
  ultimaSincronizacion: string | null; // ISO
  correo: string | null;
  traerCambios: boolean; // lo que se edite en Google de los eventos de Syntra vuelve a Syntra
  permisoLectura: boolean; // dio permiso para leer sus otros calendarios
  calendariosVisibles: { id: string; nombre: string; color: string | null }[]; // otros calendarios que se ven en Syntra
  ultimosCambios: (CambioTraido & { cuando: string })[]; // lo último que se trajo de Google
}

const VACIA: ConfigCalendario = {
  idCalendario: null,
  ultimaSincronizacion: null,
  correo: null,
  traerCambios: true,
  permisoLectura: false,
  calendariosVisibles: [],
  ultimosCambios: [],
};

export class ConfigsCalendario {
  constructor(private readonly carpeta: string) {}

  private archivo(idUsuario: number): string {
    return path.join(this.carpeta, `calendar-${idUsuario}.json`);
  }

  leer(idUsuario: number): ConfigCalendario {
    try {
      return { ...VACIA, ...JSON.parse(fs.readFileSync(this.archivo(idUsuario), 'utf8')) };
    } catch {
      return { ...VACIA };
    }
  }

  guardar(idUsuario: number, config: ConfigCalendario): void {
    fs.mkdirSync(this.carpeta, { recursive: true });
    fs.writeFileSync(this.archivo(idUsuario), JSON.stringify(config));
  }

  borrar(idUsuario: number): void {
    fs.rmSync(this.archivo(idUsuario), { force: true });
  }
}
