import { test, expect } from 'vitest';
import { EditarMapaMentalIA } from '../../logicaPersistente/gestionDeMaterialIA/editarMapaMentalIA';

// Persistencia y "obtener" falsos: alcanza con ver qué se manda a la base.
function armar(tipo: string) {
  const consultas: { sql: string; params: unknown[] }[] = [];
  const persistencia = { ejecutar: async (sql: string, params: unknown[]) => { consultas.push({ sql, params }); return []; } };
  const obtener = { ejecutar: async () => ({ idMaterialIA: 3, tipo, titulo: 'Viejo', contenido: {} }) };
  return { consultas, caso: new EditarMapaMentalIA(persistencia as never, obtener as never) };
}

const mapa = {
  titulo: 'Célula',
  nodos: [
    { id: 'n1', texto: 'Célula', padreId: null },
    { id: 'n2', texto: 'Núcleo', padreId: 'n1' },
    { id: 'nuevo1', texto: 'ADN', padreId: 'n2' },
  ],
};

test('editar mapa: guarda el título y el contenido validados', async () => {
  const { consultas, caso } = armar('mapaMental');
  await caso.ejecutar(1, 3, mapa);
  expect(consultas.length).toBe(1);
  expect(consultas[0].params[2]).toBe('Célula');
  expect(JSON.parse(consultas[0].params[3] as string).nodos.length).toBe(3);
});

test('editar mapa: rechaza un mapa con ideas sueltas y no guarda nada', async () => {
  const { consultas, caso } = armar('mapaMental');
  const roto = { ...mapa, nodos: [...mapa.nodos, { id: 'x', texto: 'Suelta', padreId: 'noExiste' }] };
  await expect(caso.ejecutar(1, 3, roto)).rejects.toThrow();
  expect(consultas.length).toBe(0);
});

test('editar mapa: solo se pueden editar mapas mentales', async () => {
  const { consultas, caso } = armar('cuestionario');
  await expect(caso.ejecutar(1, 3, mapa)).rejects.toThrow();
  expect(consultas.length).toBe(0);
});
