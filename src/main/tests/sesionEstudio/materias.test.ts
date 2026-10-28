import { describe, it, expect, beforeEach } from 'vitest';
import { GestionarMaterias } from '../../logicaPersistente/gestionDeSesionEstudio/gestionarMaterias';
import { crearPersistenciaFalsa, errorPostgres } from './datosPrueba';

describe('Materias (GestionarMaterias)', () => {
  let persistencia: ReturnType<typeof crearPersistenciaFalsa>;
  let materias: GestionarMaterias;
  beforeEach(() => {
    persistencia = crearPersistenciaFalsa();
    materias = new GestionarMaterias(persistencia as any);
  });

  it('41. Registrar una materia nueva la devuelve con 0 sesiones', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([{ id_materia: 8, nombre: 'Química', cantidad_sesiones: 0 }]);
    expect(await materias.registrar({ nombre: 'Química' })).toEqual({ idMateria: 8, nombre: 'Química', cantidadSesiones: 0 });
  });

  it('42. Registrar un nombre repetido da "Ya existe una materia con ese nombre."', async () => {
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23505'));
    await expect(materias.registrar({ nombre: 'Química' })).rejects.toThrow('Ya existe una materia con ese nombre.');
  });

  it('43. Renombrar a un nombre que ya existe da el mismo mensaje', async () => {
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23505'));
    await expect(materias.modificar(7, { idMateria: 8, nombre: 'Base de datos' })).rejects.toThrow(
      'Ya existe una materia con ese nombre.'
    );
  });

  it('44. Renombrar una materia inexistente da error', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(materias.modificar(7, { idMateria: 99, nombre: 'X' })).rejects.toThrow('La materia no existe.');
  });

  it('45. No se puede eliminar una materia con sesiones y dice cuántas son', async () => {
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23503')).mockResolvedValueOnce([{ cantidad: 3 }]);
    await expect(materias.eliminar(8)).rejects.toThrow('No se puede eliminar: hay 3 sesiones con esta materia.');
  });

  it('46. Con una sola sesión el mensaje va en singular', async () => {
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23503')).mockResolvedValueOnce([{ cantidad: 1 }]);
    await expect(materias.eliminar(8)).rejects.toThrow('No se puede eliminar: hay 1 sesión con esta materia.');
  });

  it('47. Eliminar una materia inexistente da error', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([]);
    await expect(materias.eliminar(99)).rejects.toThrow('La materia no existe.');
  });

  it('48. Listar convierte la cantidad de sesiones a número', async () => {
    persistencia.ejecutar.mockResolvedValueOnce([{ id_materia: 1, nombre: 'Base de datos', cantidad_sesiones: '2' }]);
    const lista = await materias.listar(7);
    expect(lista[0].cantidadSesiones).toBe(2);
    expect(persistencia.ejecutar.mock.calls[0][1]).toEqual([7]);
  });
});
