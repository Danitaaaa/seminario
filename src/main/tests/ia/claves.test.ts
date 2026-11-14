import { test, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AlmacenClaves, ErrorClaves } from '../../servicios/ia/almacenClaves';

// ---------- claves ----------
const safeFalso = (disponible = true) => ({
  isEncryptionAvailable: () => disponible,
  encryptString: (t: string) => Buffer.from([...Buffer.from(t)].map((b) => b ^ 0x5a)),
  decryptString: (b: Buffer) => Buffer.from([...b].map((x) => x ^ 0x5a)).toString(),
});

test('claves: guarda cifrado, recupera y no deja texto plano en disco', () => {
  const ruta = join(mkdtempSync(join(tmpdir(), 'syntra-')), 'sub', 'claves.json');
  const a = new AlmacenClaves(ruta, safeFalso());
  a.establecer('gemini', '  AIzaSyEJEMPLO1234567890  ');
  expect(a.obtener('gemini')).toBe('AIzaSyEJEMPLO1234567890');
  expect(a.enmascarada('gemini')).toBe('AIza…7890');
  expect(!readFileSync(ruta, 'utf8').includes('AIzaSy')).toBe(true);
  expect(a.existe('luna')).toBe(false);
  a.borrar('gemini');
  expect(a.obtener('gemini')).toBe(undefined);
});

test('claves: rechaza vacía y falta de cifrado', () => {
  const ruta = join(mkdtempSync(join(tmpdir(), 'syntra-')), 'c.json');
  expect(() => new AlmacenClaves(ruta, safeFalso()).establecer('x', '  ')).toThrow(ErrorClaves);
  expect(() => new AlmacenClaves(ruta, safeFalso(false)).establecer('x', 'abc')).toThrow(ErrorClaves);
});

