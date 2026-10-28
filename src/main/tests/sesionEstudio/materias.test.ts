import { describe, it, expect } from 'vitest';
import { GestionarMaterias } from '../../logicaPersistente/gestionDeSesionEstudio/gestionarMaterias';
import { crearPersistenciaFalsa, errorPostgres } from './datosPrueba';

describe('Materias (GestionarMaterias)', () => {
  it('14. No se pueden cargar dos materias con el mismo nombre', async () => {
    const persistencia = crearPersistenciaFalsa();
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23505'));
    await expect(new GestionarMaterias(persistencia as any).registrar({ nombre: 'Química' })).rejects.toThrow(
      'Ya existe una materia con ese nombre.'
    );
  });

  it('15. No se puede eliminar una materia que tiene sesiones y avisa cuántas son', async () => {
    const persistencia = crearPersistenciaFalsa();
    persistencia.ejecutar.mockRejectedValueOnce(errorPostgres('23503')).mockResolvedValueOnce([{ cantidad: 3 }]);
    await expect(new GestionarMaterias(persistencia as any).eliminar(8)).rejects.toThrow(
      'No se puede eliminar: hay 3 sesiones con esta materia.'
    );
  });
});