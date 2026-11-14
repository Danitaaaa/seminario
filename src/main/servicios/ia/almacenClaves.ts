// src/main/logicaNoPersistente/ia/proveedores/almacenClaves.ts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** `safeStorage` de Electron cumple esta forma; en tests usamos uno falso. */
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(texto: string): Buffer;
  decryptString(cifrado: Buffer): string;
}

export class ErrorClaves extends Error {
  constructor(
    readonly codigo: 'sin_cifrado' | 'ilegible' | 'vacia',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorClaves';
  }
}

type Contenido = Record<string, string>; // id proveedor → base64(cifrado)

export class AlmacenClaves {
  /**
   * @param archivo ruta DENTRO de app.getPath('userData'): así queda por instancia
   *                (electron-data-1 y electron-data-2 no comparten claves).
   */
  constructor(
    private readonly archivo: string,
    private readonly safe: SafeStorageLike,
  ) {}

  establecer(proveedor: string, clave: string): void {
    const limpia = clave.trim();
    if (!limpia) throw new ErrorClaves('vacia', 'La clave está vacía');
    if (!this.safe.isEncryptionAvailable())
      throw new ErrorClaves('sin_cifrado', 'El sistema no ofrece cifrado seguro');

    const c = this.leer();
    c[proveedor] = this.safe.encryptString(limpia).toString('base64');
    this.guardar(c);
  }

  obtener(proveedor: string): string | undefined {
    const b64 = this.leer()[proveedor];
    if (!b64) return undefined;
    try {
      return this.safe.decryptString(Buffer.from(b64, 'base64'));
    } catch (e) {
      throw new ErrorClaves('ilegible', `No se pudo descifrar la clave de ${proveedor}`);
    }
  }

  existe(proveedor: string): boolean {
    return proveedor in this.leer();
  }

  borrar(proveedor: string): void {
    const c = this.leer();
    delete c[proveedor];
    this.guardar(c);
  }

  /** Enmascarada para mostrar en Ajustes: "AIza…x9Qz". Nunca la completa. */
  enmascarada(proveedor: string): string | undefined {
    const k = this.obtener(proveedor);
    if (!k) return undefined;
    return k.length <= 10 ? '••••' : `${k.slice(0, 4)}…${k.slice(-4)}`;
  }

  private leer(): Contenido {
    try {
      return JSON.parse(readFileSync(this.archivo, 'utf8')) as Contenido;
    } catch {
      return {}; // primera vez o archivo inexistente
    }
  }

  private guardar(c: Contenido): void {
    mkdirSync(dirname(this.archivo), { recursive: true });
    const tmp = `${this.archivo}.tmp`;
    writeFileSync(tmp, JSON.stringify(c), { mode: 0o600 });
    renameSync(tmp, this.archivo); // escritura atómica: no queda a medio escribir
  }
}