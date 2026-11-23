import crypto from 'node:crypto';

// Formato del archivo .syntra: MARCA | sal (16) | iv (12) | etiqueta (16) | contenido cifrado (AES-256-GCM).
// La clave sale de la contraseña del usuario con scrypt; sin la contraseña no se puede abrir.
const MARCA = Buffer.from('SYNTRACOPIA1');
const LARGO_SAL = 16;
const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;
const OPCIONES_SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export interface ClaveCopia {
  sal: Buffer;
  clave: Buffer;
}

export class ErrorCopiaInvalida extends Error {}

export const salNueva = () => crypto.randomBytes(LARGO_SAL);

export function derivarClave(password: string, sal: Buffer): ClaveCopia {
  return { sal, clave: crypto.scryptSync(password.normalize('NFC'), sal, 32, OPCIONES_SCRYPT) };
}

export function cifrarCopia(contenido: Buffer, { sal, clave }: ClaveCopia): Buffer {
  const iv = crypto.randomBytes(LARGO_IV);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const cifrado = Buffer.concat([cifrador.update(contenido), cifrador.final()]);
  return Buffer.concat([MARCA, sal, iv, cifrador.getAuthTag(), cifrado]);
}

// Si la contraseña no es la de la copia o el archivo se modificó, GCM lo detecta y no devuelve nada.
export function descifrarCopia(archivo: Buffer, password: string): Buffer {
  const cabecera = MARCA.length + LARGO_SAL + LARGO_IV + LARGO_ETIQUETA;
  if (archivo.length <= cabecera || !archivo.subarray(0, MARCA.length).equals(MARCA)) {
    throw new ErrorCopiaInvalida('Este archivo no es una copia de seguridad de Syntra.');
  }
  let pos = MARCA.length;
  const sal = archivo.subarray(pos, (pos += LARGO_SAL));
  const iv = archivo.subarray(pos, (pos += LARGO_IV));
  const etiqueta = archivo.subarray(pos, (pos += LARGO_ETIQUETA));
  const { clave } = derivarClave(password, Buffer.from(sal));
  try {
    const descifrador = crypto.createDecipheriv('aes-256-gcm', clave, iv);
    descifrador.setAuthTag(etiqueta);
    return Buffer.concat([descifrador.update(archivo.subarray(pos)), descifrador.final()]);
  } catch {
    throw new ErrorCopiaInvalida('La contraseña no es la de esta copia, o el archivo está dañado.');
  }
}
