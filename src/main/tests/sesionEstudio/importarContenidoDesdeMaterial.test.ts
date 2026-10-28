import { describe, it, expect } from 'vitest';
import { ImportarContenidoDesdeMaterial } from '../../logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeMaterial';

interface Pestana {
  id_pestana: number;
  titulo: string;
  contenido: string;
  orden: number;
}

// Base falsa en memoria: simula sesion_estudio (una sesión con su Word) y pestana_sesion.
function crearBaseFalsa(idArchivoDeLaSesion: number, pestanas: Omit<Pestana, 'orden'>[]) {
  let siguienteId = 100;
  const base = {
    contenidoSesion: '',
    pestanas: pestanas.map((p, i) => ({ ...p, orden: i })) as Pestana[],
    async ejecutar(sql: string, valores: any[]): Promise<any[]> {
      if (sql.includes('UPDATE sesion_estudio')) {
        if (valores[0] !== idArchivoDeLaSesion) return [];
        base.contenidoSesion = valores[1];
        return [{ id_sesion_estudio: 1 }];
      }
      if (sql.includes('SELECT id_pestana')) {
        return [...base.pestanas].sort((a, b) => a.orden - b.orden).map(({ id_pestana, titulo }) => ({ id_pestana, titulo }));
      }
      if (sql.includes('UPDATE pestana_sesion')) {
        const p = base.pestanas.find((x) => x.id_pestana === valores[0])!;
        p.titulo = valores[1];
        p.contenido = valores[2];
        if (valores[3] !== undefined) p.orden = valores[3];
        return [];
      }
      if (sql.includes('INSERT INTO pestana_sesion')) {
        base.pestanas.push({ id_pestana: siguienteId++, titulo: valores[1], contenido: valores[2], orden: valores[3] });
        return [];
      }
      if (sql.includes('DELETE FROM pestana_sesion')) {
        base.pestanas = base.pestanas.filter((p) => !valores[0].includes(p.id_pestana));
        return [];
      }
      throw new Error('Consulta no esperada: ' + sql);
    },
  };
  return base;
}

const ordenadas = (base: ReturnType<typeof crearBaseFalsa>) =>
  [...base.pestanas].sort((a, b) => a.orden - b.orden).map(({ titulo, contenido }) => ({ titulo, contenido }));

describe('Cambios del Word hechos en Material (ImportarContenidoDesdeWord)', () => {
  it('16. Con una sola pestaña, todo el Word pasa a esa pestaña', async () => {
    const base = crearBaseFalsa(10, [{ id_pestana: 1, titulo: 'Pestaña 1', contenido: '<p>viejo</p>' }]);
    expect(await new ImportarContenidoDesdeMaterial(base as any).ejecutar(10, '<p>nuevo</p>')).toBe(true);
    expect(ordenadas(base)).toEqual([{ titulo: 'Pestaña 1', contenido: '<p>nuevo</p>' }]);
  });

  it('17. Con varias pestañas, cada título del Word va a su pestaña', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'Pestaña 1', contenido: '' },
      { id_pestana: 2, titulo: 'Teoría', contenido: '' },
    ]);
    await new ImportarContenidoDesdeMaterial(base as any).ejecutar(10, '<h1>Pestaña 1</h1><p>uno</p><h1>Teoría</h1><p>dos</p>');
    expect(ordenadas(base)).toEqual([
      { titulo: 'Pestaña 1', contenido: '<p>uno</p>' },
      { titulo: 'Teoría', contenido: '<p>dos</p>' },
    ]);
  });
});