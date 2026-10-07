import { describe, it, expect, vi } from 'vitest';
import { CrearEvento } from './CrearEvento';
import { ModificarEvento } from './ModificarEvento';
import { ListarEventos } from './ListarEventos';
import { EliminarEvento } from './EliminarEvento';

describe('Casos de Uso de Eventos', () => {
  const mockPersistencia = {
    ejecutar: vi.fn()
  };

  // Objeto de retorno simulado para que materializarEvento no lance error por undefined
  const eventoMockFila = {
    id: 1,
    usuario_id: 'usr-1',
    titulo: 'Prueba',
    categoria: 'Otro',
    prioridad: 'media',
    notificaciones_activas: false,
    recordatorios: '[]'
  };

  it('8. Inserción con parámetros SQL en CrearEvento', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new CrearEvento(mockPersistencia as any);

    const datos = { titulo: 'Prueba', usuarioId: 'usr-1' };
    await casoUso.ejecutar(datos);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 8 OUTPUT] SQL Query:', callArgs[0]);
    console.log('[TEST 8 OUTPUT] Parámetros:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      expect.arrayContaining(['Prueba', 'usr-1'])
    );
  });

  it('9. Modificar un único campo con UPDATE dinámico', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ModificarEvento(mockPersistencia as any);

    // Pasa el objeto con id, datos a modificar y usuarioId
    await casoUso.ejecutar({ id: 1, titulo: 'Nuevo Título', usuarioId: 'usr-1' } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 9 OUTPUT] SQL Update:', callArgs[0]);
    console.log('[TEST 9 OUTPUT] Parámetros:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE.*SET.*titulo/i),
      expect.arrayContaining(['Nuevo Título'])
    );
  });

  it('10. Modificar múltiples campos simultáneamente', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ModificarEvento(mockPersistencia as any);

    await casoUso.ejecutar({ id: 1, titulo: 'Nuevo', prioridad: 'alta', usuarioId: 'usr-1' } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 10 OUTPUT] SQL Multi-UPDATE:', callArgs[0]);
    console.log('[TEST 10 OUTPUT] Parámetros:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringMatching(/SET.*titulo.*prioridad/i),
      expect.arrayContaining(['Nuevo', 'alta'])
    );
  });

  it('11. Aplique de casteo ::jsonb en recordatorios', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ModificarEvento(mockPersistencia as any);
    const recordatorios = [{ cantidad: 10, unidad: 'minutos' }];

    await casoUso.ejecutar({ id: 1, recordatorios, usuarioId: 'usr-1' } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 11 OUTPUT] SQL con Casteo JSONB:', callArgs[0]);
    console.log('[TEST 11 OUTPUT] Valor Stringificado:', callArgs[1][0]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringContaining('::jsonb'),
      expect.arrayContaining([JSON.stringify(recordatorios)])
    );
  });

  it('12. Listar eventos sin filtros de fechas', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ListarEventos(mockPersistencia as any);

    await casoUso.ejecutar({ usuarioId: 'usr-1' } as any);

    const query = mockPersistencia.ejecutar.mock.calls[0][0];
    console.log('[TEST 12 OUTPUT] Query sin filtros:', query);

    expect(query).not.toContain('fecha >=');
    expect(query).not.toContain('fecha <=');
  });

  it('13. Listar eventos filtrando solo por fecha desde', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ListarEventos(mockPersistencia as any);
    const desde = new Date('2026-10-01');

    await casoUso.ejecutar({ usuarioId: 'usr-1', desde } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 13 OUTPUT] Query fecha desde:', callArgs[0]);
    console.log('[TEST 13 OUTPUT] Parámetro desde:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringContaining('WHERE'),
      expect.arrayContaining([desde])
    );
  });

  it('14. Listar eventos filtrando solo por fecha hasta', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ListarEventos(mockPersistencia as any);
    const hasta = new Date('2026-10-31');

    await casoUso.ejecutar({ usuarioId: 'usr-1', hasta } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 14 OUTPUT] Query fecha hasta:', callArgs[0]);
    console.log('[TEST 14 OUTPUT] Parámetro hasta:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringContaining('WHERE'),
      expect.arrayContaining([hasta])
    );
  });

  it('15. Listar eventos filtrando por rango de fechas completo', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([eventoMockFila]);
    const casoUso = new ListarEventos(mockPersistencia as any);
    const desde = new Date('2026-10-01');
    const hasta = new Date('2026-10-31');

    await casoUso.ejecutar({ usuarioId: 'usr-1', desde, hasta } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 15 OUTPUT] Query rango completo:', callArgs[0]);
    console.log('[TEST 15 OUTPUT] Parámetros rango:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      expect.stringContaining('WHERE'),
      expect.arrayContaining([desde, hasta])
    );
  });

  it('21. Eliminar evento existente por ID', async () => {
    mockPersistencia.ejecutar.mockReset();
    mockPersistencia.ejecutar.mockResolvedValueOnce([]);
    const casoUso = new EliminarEvento(mockPersistencia as any);

    await casoUso.ejecutar({ id: 5 } as any);

    const callArgs = mockPersistencia.ejecutar.mock.calls[0];
    console.log('[TEST 21 OUTPUT] Query DELETE:', callArgs[0]);
    console.log('[TEST 21 OUTPUT] ID a eliminar:', callArgs[1]);

    expect(mockPersistencia.ejecutar).toHaveBeenCalledWith(
      'DELETE FROM eventos WHERE id = $1',
      expect.arrayContaining([5])
    );
  });
});