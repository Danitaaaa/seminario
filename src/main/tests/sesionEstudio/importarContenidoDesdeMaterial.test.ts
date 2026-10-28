import { describe, it, expect } from 'vitest';
import { ImportarContenidoDesdeWord } from '../../logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeWord';

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

describe('Traer al sistema los cambios del Word hechos en Material (ImportarContenidoDesdeWord)', () => {
  it('49. Un Word que no es de ninguna sesión no cambia nada', async () => {
    const base = crearBaseFalsa(10, [{ id_pestana: 1, titulo: 'Pestaña 1', contenido: '<p>viejo</p>' }]);
    expect(await new ImportarContenidoDesdeWord(base as any).ejecutar(999, '<p>x</p>')).toBe(false);
    expect(base.pestanas[0].contenido).toBe('<p>viejo</p>');
  });

  it('50. Con una sola pestaña, todo el Word pasa a esa pestaña', async () => {
    const base = crearBaseFalsa(10, [{ id_pestana: 1, titulo: 'Pestaña 1', contenido: '<p>viejo</p>' }]);
    expect(await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<p>nuevo</p>')).toBe(true);
    expect(ordenadas(base)).toEqual([{ titulo: 'Pestaña 1', contenido: '<p>nuevo</p>' }]);
    expect(base.contenidoSesion).toBe('<p>nuevo</p>');
  });

  it('51. Con varias pestañas, cada título del Word va a su pestaña', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'Pestaña 1', contenido: '' },
      { id_pestana: 2, titulo: 'Teoría', contenido: '' },
    ]);
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<h1>Pestaña 1</h1><p>uno</p><h1>Teoría &amp; práctica</h1><p>dos</p>');
    expect(ordenadas(base)).toEqual([
      { titulo: 'Pestaña 1', contenido: '<p>uno</p>' },
      { titulo: 'Teoría & práctica', contenido: '<p>dos</p>' },
    ]);
  });

  it('52. El texto antes del primer título se suma a la primera pestaña', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'A', contenido: '' },
      { id_pestana: 2, titulo: 'B', contenido: '' },
    ]);
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<p>intro</p><h1>A</h1><p>1</p><h1>B</h1><p>2</p>');
    expect(ordenadas(base)[0].contenido).toBe('<p>intro</p><p>1</p>');
  });

  it('53. Si se agregó un título en el Word, se crea otra pestaña', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'A', contenido: '' },
      { id_pestana: 2, titulo: 'B', contenido: '' },
    ]);
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<h1>A</h1><p>1</p><h1>B</h1><p>2</p><h1>C</h1><p>3</p>');
    expect(ordenadas(base).map((p) => p.titulo)).toEqual(['A', 'B', 'C']);
  });

  it('54. Si se borraron títulos, se borran las pestañas que sobran', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'A', contenido: '' },
      { id_pestana: 2, titulo: 'B', contenido: '' },
      { id_pestana: 3, titulo: 'C', contenido: '' },
    ]);
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<h1>Solo</h1><p>todo</p>');
    expect(ordenadas(base)).toEqual([{ titulo: 'Solo', contenido: '<p>todo</p>' }]);
  });

  it('55. Varias pestañas y un Word sin títulos: queda una sola con todo', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'A', contenido: '' },
      { id_pestana: 2, titulo: 'B', contenido: '' },
    ]);
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, '<p>sin títulos</p>');
    expect(ordenadas(base)).toEqual([{ titulo: 'A', contenido: '<p>sin títulos</p>' }]);
  });

  it('56. Más de 12 títulos: quedan 12 pestañas y el resto va en la última', async () => {
    const base = crearBaseFalsa(10, [
      { id_pestana: 1, titulo: 'A', contenido: '' },
      { id_pestana: 2, titulo: 'B', contenido: '' },
    ]);
    const html = Array.from({ length: 14 }, (_, i) => `<h1>T${i}</h1><p>${i}</p>`).join('');
    await new ImportarContenidoDesdeWord(base as any).ejecutar(10, html);
    const resultado = ordenadas(base);
    expect(resultado).toHaveLength(12);
    expect(resultado[11].contenido).toContain('<h1>T13</h1>');
  });
});
