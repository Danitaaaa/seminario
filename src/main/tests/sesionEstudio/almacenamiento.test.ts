import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Almacenamiento } from '../../persistencia/almacenamiento';

describe('Guardar un archivo abierto en otra aplicación (Almacenamiento.reemplazar)', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'test-almacenamiento-'));

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(carpeta, { recursive: true, force: true });
  });

  it('18. Si el Word está abierto, avisa con un mensaje claro y no deja el .tmp', async () => {
    const almacenamiento = new Almacenamiento(path.join(carpeta, 'archivos'));
    fs.writeFileSync(path.join(carpeta, 'archivos', 'sesion.docx'), 'viejo');
    const origen = path.join(carpeta, 'nuevo.docx');
    fs.writeFileSync(origen, 'nuevo');

    // Simula el error que da Windows cuando otro programa tiene el archivo abierto.
    vi.spyOn(fs.promises, 'rename').mockRejectedValue(Object.assign(new Error('EPERM'), { code: 'EPERM' }));

    await expect(almacenamiento.reemplazar('sesion.docx', origen)).rejects.toThrow(
      'No se pudo guardar: el archivo está abierto en otra aplicación (por ejemplo, Word). Cerralo y volvé a intentar.'
    );
    expect(fs.existsSync(path.join(carpeta, 'archivos', 'sesion.docx.tmp'))).toBe(false);
    expect(fs.readFileSync(path.join(carpeta, 'archivos', 'sesion.docx'), 'utf8')).toBe('viejo');
  });
});