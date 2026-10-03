import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Almacenamiento } from '../../../persistencia/almacenamiento';

let fallos = 0;

// Verifica una condición e informa el resultado.
export function verificar(titulo: string, condicion: boolean, detalle?: unknown) {
  console.log(`--- ${titulo} ---`);
  if (condicion) {
    console.log('OK');
  } else {
    fallos++;
    console.log('FALLO', detalle ?? '');
  }
}

// Ejecuta fn y espera que lance un error.
export async function esperarError(titulo: string, fn: () => Promise<unknown>) {
  console.log(`--- ${titulo} ---`);
  try {
    const r = await fn();
    fallos++;
    console.log('FALLO: no lanzó error, devolvió', r);
  } catch (e: any) {
    console.log('OK, error esperado:', e.message);
  }
}

// Imprime el resumen y fija el exit code.
export function terminar() {
  console.log(fallos === 0 ? '\nTodos los casos OK' : `\n${fallos} caso(s) fallaron`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

// Almacenamiento temporal + archivos de origen reales para los tests.
export class EntornoArchivos {
  readonly dirAlmacen = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  readonly dirOrigen = fs.mkdtempSync(path.join(os.tmpdir(), 'origen-'));
  readonly almacenamiento = new Almacenamiento(this.dirAlmacen);
  private contador = 0;

  // Crea un archivo de origen. Con un número, genera ese cantidad de bytes.
  origen(contenido: string | number = 'contenido'): string {
    const datos = typeof contenido === 'number' ? 'x'.repeat(contenido) : contenido;
    const ruta = path.join(this.dirOrigen, `origen-${this.contador++}.bin`);
    fs.writeFileSync(ruta, datos);
    return ruta;
  }

  // Ruta completa en disco de un archivo ya guardado en el almacenamiento.
  fisico(rutaFisica: string): string {
    return this.almacenamiento.rutaCompleta(rutaFisica);
  }

  limpiar() {
    fs.rmSync(this.dirAlmacen, { recursive: true, force: true });
    fs.rmSync(this.dirOrigen, { recursive: true, force: true });
  }
}