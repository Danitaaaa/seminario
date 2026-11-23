import fs from 'node:fs';
import path from 'node:path';
import type { DriveCliente } from '../logicaNoPersistente/drive/driveCliente';
import { ErrorSinPermiso } from '../logicaNoPersistente/drive/oauthDrive';
import { cifrarCopia, descifrarCopia, type ClaveCopia } from '../logicaNoPersistente/copiaSeguridad/cifradoCopia';
import { armarPaquete, leerPaquete, rutaSegura, CARPETAS_COPIA, type MetaCopia } from '../logicaNoPersistente/copiaSeguridad/paqueteCopia';
import type { ClavesCopia } from '../logicaNoPersistente/copiaSeguridad/clavesCopia';
import type { ExportarBase, ContarUsuarios } from '../logicaPersistente/gestionDeCopiaSeguridad/exportarBase';
import type { RestaurarBase } from '../logicaPersistente/gestionDeCopiaSeguridad/restaurarBase';
import type { VerificarPassword } from '../logicaPersistente/gestionDeUsuarios/verificarPassword';
import { usuarioSesionSync } from '../sesionSync';

const CARPETA_DRIVE = 'Syntra - Copias de seguridad';
const COPIAS_EN_DRIVE = 3; // se guardan las últimas tres
const DIAS_ENTRE_COPIAS = 7;

export interface EstadoCopiaSeguridad {
  claveGuardada: boolean; // puede copiar sin pedir la contraseña
  puedeGuardarClave: boolean; // false en un Linux sin llavero
  automatica: boolean;
  ultima: { fecha: string; tamanio: number; lugar: 'drive' | 'archivo' } | null;
  variosUsuarios: boolean; // en esta compu hay más de un usuario: no se puede copiar
}

export interface CopiaEnDrive {
  id: string;
  nombre: string;
  tamanio: number;
  fecha: string;
}

interface ConfigCopia {
  automatica: boolean;
  ultima: EstadoCopiaSeguridad['ultima'];
}

export type OrigenCopia = { drive: string } | { archivo: string };

function usuarioActual(): number {
  const id = usuarioSesionSync();
  if (id == null) throw new Error('No hay una sesión iniciada.');
  return id;
}

// Copia de seguridad de Syntra: toda la base y los archivos de la compu, cifrados con la contraseña
// del usuario, en su Google Drive (o en un archivo). Restaurar reemplaza todo lo de la compu.
export class CopiaSeguridad {
  constructor(
    private readonly exportar: ExportarBase,
    private readonly restaurarBase: RestaurarBase,
    private readonly contarUsuarios: ContarUsuarios,
    private readonly verificarPassword: VerificarPassword,
    private readonly claves: ClavesCopia,
    private readonly drive: DriveCliente, // puede abrir el inicio de sesión de Google
    private readonly driveSinLogin: DriveCliente, // para la copia automática: nunca abre el navegador
    private readonly carpetaDatos: string,
    private readonly appVersion: string,
  ) {}

  private archivoConfig(idUsuario: number) {
    return path.join(this.carpetaDatos, `copia-seguridad-${idUsuario}.json`);
  }

  private leerConfig(idUsuario: number): ConfigCopia {
    try {
      return { automatica: true, ultima: null, ...JSON.parse(fs.readFileSync(this.archivoConfig(idUsuario), 'utf8')) };
    } catch {
      return { automatica: true, ultima: null };
    }
  }

  private guardarConfig(idUsuario: number, config: ConfigCopia): void {
    fs.writeFileSync(this.archivoConfig(idUsuario), JSON.stringify(config));
  }

  async estado(): Promise<EstadoCopiaSeguridad> {
    const idUsuario = usuarioActual();
    const config = this.leerConfig(idUsuario);
    return {
      claveGuardada: this.claves.leer(idUsuario) !== null,
      puedeGuardarClave: this.claves.puedeGuardar(),
      automatica: config.automatica,
      ultima: config.ultima,
      variosUsuarios: (await this.contarUsuarios.ejecutar()) > 1,
    };
  }

  // Al iniciar sesión con contraseña y al cambiarla: se arma (y guarda) la clave de las copias.
  alIniciarSesion(idUsuario: number, password: string | null): void {
    if (!password) return;
    try {
      this.claves.guardar(idUsuario, password);
    } catch (error) {
      console.error('[Copia] No se pudo guardar la clave de las copias:', error);
    }
  }

  configurar(automatica: boolean): Promise<EstadoCopiaSeguridad> {
    const idUsuario = usuarioActual();
    this.guardarConfig(idUsuario, { ...this.leerConfig(idUsuario), automatica });
    return this.estado();
  }

  // La clave guardada o, si no hay (entró con la cara o es un Linux sin llavero), la de la contraseña que escribió.
  private async clave(idUsuario: number, password?: string): Promise<ClaveCopia> {
    if (password) {
      await this.verificarPassword.ejecutar({ id: idUsuario, password });
      return this.claves.guardar(idUsuario, password);
    }
    const guardada = this.claves.leer(idUsuario);
    if (!guardada) throw new Error('Escribí tu contraseña para cifrar la copia.');
    return guardada;
  }

  // Arma la copia cifrada. Con más de un usuario en la compu no se hace: tendría los datos de los otros.
  private async armar(idUsuario: number, password?: string): Promise<Buffer> {
    if ((await this.contarUsuarios.ejecutar()) > 1) {
      throw new Error('En esta compu hay más de un usuario de Syntra: la copia de seguridad solo se puede hacer cuando hay uno.');
    }
    const clave = await this.clave(idUsuario, password);
    const meta: MetaCopia = {
      version: 1,
      fecha: new Date().toISOString(),
      appVersion: this.appVersion,
      carpetaDatos: this.carpetaDatos,
      usuarios: 1,
    };
    const paquete = await armarPaquete({ meta, tablas: await this.exportar.ejecutar() }, this.carpetaDatos);
    return cifrarCopia(paquete, clave);
  }

  private nombreCopia(fecha = new Date()) {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `Syntra ${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ${dos(fecha.getHours())}.${dos(fecha.getMinutes())}.syntra`;
  }

  // "Copiar a Drive ahora": sube la copia y deja solo las últimas tres.
  async copiarADrive(password?: string, cliente: DriveCliente = this.drive): Promise<EstadoCopiaSeguridad> {
    const idUsuario = usuarioActual();
    const copia = await this.armar(idUsuario, password);
    const carpeta = await cliente.carpetaCopias(CARPETA_DRIVE);
    await cliente.subirCopia(carpeta, this.nombreCopia(), copia);
    const copias = await cliente.listarCopias(carpeta);
    for (const vieja of copias.slice(COPIAS_EN_DRIVE)) {
      await cliente.borrarCopia(vieja.id).catch((e) => console.error('[Copia] No se pudo borrar una copia vieja:', e));
    }
    this.guardarConfig(idUsuario, { ...this.leerConfig(idUsuario), ultima: { fecha: new Date().toISOString(), tamanio: copia.length, lugar: 'drive' } });
    return this.estado();
  }

  nombreSugerido(): string {
    return this.nombreCopia();
  }

  async guardarEnArchivo(destino: string, password?: string): Promise<EstadoCopiaSeguridad> {
    const idUsuario = usuarioActual();
    const copia = await this.armar(idUsuario, password);
    await fs.promises.writeFile(destino, copia);
    this.guardarConfig(idUsuario, { ...this.leerConfig(idUsuario), ultima: { fecha: new Date().toISOString(), tamanio: copia.length, lugar: 'archivo' } });
    return this.estado();
  }

  // Cada tanto, en segundo plano: si pasó una semana, copia a Drive sin abrir nada ni mostrar errores.
  async copiaAutomatica(): Promise<void> {
    const idUsuario = usuarioSesionSync();
    if (idUsuario == null) return;
    const config = this.leerConfig(idUsuario);
    if (!config.automatica || !this.claves.leer(idUsuario)) return;
    if (config.ultima && Date.now() - new Date(config.ultima.fecha).getTime() < DIAS_ENTRE_COPIAS * 86_400_000) return;
    try {
      await this.copiarADrive(undefined, this.driveSinLogin);
    } catch (error) {
      if (!(error instanceof ErrorSinPermiso)) console.error('[Copia] Falló la copia automática:', error);
    }
  }

  // Desde el inicio solo se puede restaurar en una compu sin usuarios (si no, se haría desde Ajustes).
  async puedeRestaurarDesdeInicio(): Promise<boolean> {
    return (await this.contarUsuarios.ejecutar()) === 0;
  }

  async copiasEnDrive(): Promise<CopiaEnDrive[]> {
    const carpeta = await this.drive.carpetaCopias(CARPETA_DRIVE);
    return this.drive.listarCopias(carpeta);
  }

  // Reemplaza todo lo de esta compu por lo de la copia. Antes guarda lo que había en una carpeta aparte.
  async restaurar(origen: OrigenCopia, password: string, desdeInicio: boolean): Promise<{ fecha: string }> {
    if (desdeInicio && !(await this.puedeRestaurarDesdeInicio())) {
      throw new Error('Esta compu ya tiene usuarios de Syntra: para restaurar, iniciá sesión y andá a Ajustes.');
    }
    const archivo = 'drive' in origen ? await this.drive.descargarCopia(origen.drive) : await fs.promises.readFile(origen.archivo);
    const paquete = await leerPaquete(descifrarCopia(archivo, password));
    // Antes de tocar nada: que ningún archivo de la copia se escape de su carpeta.
    for (const a of paquete.archivos) rutaSegura(path.join(this.carpetaDatos, a.carpeta), a.relativa);

    // Lo que había: la base en JSON y las carpetas, en "antes-de-restaurar-<fecha>".
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const resguardo = path.join(this.carpetaDatos, `antes-de-restaurar-${marca}`);
    fs.mkdirSync(resguardo, { recursive: true });
    fs.writeFileSync(path.join(resguardo, 'base.json'), JSON.stringify(await this.exportar.ejecutar()));

    await this.restaurarBase.ejecutar(paquete.tablas, paquete.meta.carpetaDatos, this.carpetaDatos);

    for (const carpeta of CARPETAS_COPIA) {
      const actual = path.join(this.carpetaDatos, carpeta);
      if (fs.existsSync(actual)) fs.renameSync(actual, path.join(resguardo, carpeta));
      fs.mkdirSync(actual, { recursive: true });
    }
    for (const a of paquete.archivos) {
      const destino = rutaSegura(path.join(this.carpetaDatos, a.carpeta), a.relativa);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, await a.leer());
    }
    return { fecha: paquete.meta.fecha };
  }
}
