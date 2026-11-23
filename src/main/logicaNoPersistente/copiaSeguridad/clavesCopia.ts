import fs from 'node:fs';
import path from 'node:path';
import type { Cifrador } from '../drive/almacenTokensDrive';
import { derivarClave, salNueva, type ClaveCopia } from './cifradoCopia';

// La clave de las copias de cada usuario, guardada en esta compu cifrada por el sistema
// (Windows o el llavero de Linux). Así la copia automática funciona aunque se entre con la cara.
// Nunca viaja con la copia: en otra compu se pide la contraseña.
export class ClavesCopia {
  constructor(
    private readonly carpeta: string,
    private readonly cifrador: Cifrador,
    private readonly cifradoSeguro: () => boolean, // false en un Linux sin llavero: ahí no se guarda
  ) {}

  private archivo(idUsuario: number) {
    return path.join(this.carpeta, `copia-clave-${idUsuario}.bin`);
  }

  // La sal es siempre la misma para cada usuario: la misma contraseña da la misma clave.
  private salDe(idUsuario: number): Buffer {
    const archivo = path.join(this.carpeta, `copia-sal-${idUsuario}.bin`);
    if (fs.existsSync(archivo)) return fs.readFileSync(archivo);
    const sal = salNueva();
    fs.mkdirSync(this.carpeta, { recursive: true });
    fs.writeFileSync(archivo, sal);
    return sal;
  }

  puedeGuardar(): boolean {
    return this.cifrador.disponible() && this.cifradoSeguro();
  }

  // Se llama al iniciar sesión con contraseña y al cambiarla.
  guardar(idUsuario: number, password: string): ClaveCopia {
    const clave = derivarClave(password, this.salDe(idUsuario));
    if (this.puedeGuardar()) {
      const texto = JSON.stringify({ sal: clave.sal.toString('base64'), clave: clave.clave.toString('base64') });
      fs.mkdirSync(this.carpeta, { recursive: true });
      fs.writeFileSync(this.archivo(idUsuario), this.cifrador.cifrar(texto));
    }
    return clave;
  }

  leer(idUsuario: number): ClaveCopia | null {
    try {
      const { sal, clave } = JSON.parse(this.cifrador.descifrar(fs.readFileSync(this.archivo(idUsuario))));
      return { sal: Buffer.from(sal, 'base64'), clave: Buffer.from(clave, 'base64') };
    } catch {
      return null;
    }
  }
}
