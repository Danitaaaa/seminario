import { test, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extraerTexto } from '../../logicaNoPersistente/ia/extractorTexto';
import { carpetaTemporal, crearPdfDePrueba } from './ayudas';

let pdf = '';
beforeAll(async () => {
  pdf = await crearPdfDePrueba();
});

test('extractor: rechaza archivos que no son PDF ni DOCX', async () => {
  const archivo = path.join(carpetaTemporal(), 'a.txt');
  fs.writeFileSync(archivo, 'hola');
  await expect(extraerTexto(archivo, 'txt')).rejects.toMatchObject({ codigo: 'TIPO_NO_SOPORTADO' });
});

test('extractor: lee un PDF y une las palabras cortadas con guion', async () => {
  const { texto, paginas } = await extraerTexto(pdf, 'pdf');
  expect(paginas).toBe(2);
  expect(texto.includes('celula mediante')).toBe(true);
});
