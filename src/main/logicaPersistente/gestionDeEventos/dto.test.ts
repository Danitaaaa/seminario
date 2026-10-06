import { describe, it, expect } from 'vitest';
import { 
  crearEventoSchema, 
  modificarEventoSchema, 
  listarEventosSchema 
} from './dto';

describe('Validaciones DTO (dto.ts)', () => {
  it('1. Validar crearEventoSchema con datos válidos', () => {
    const datosValidos = {
      usuarioId: '123e4567-e89b-12d3-a456-426614174000',
      titulo: 'Examen Final',
      fechaInicio: new Date('2026-10-10T10:00:00Z'),
      fechaFin: new Date('2026-10-10T12:00:00Z'),
      prioridad: 'alta',
      categoria: 'Estudio',
      notificacionesActivas: true,
      recordatorios: [{ cantidad: 30, unidad: 'minutos' }]
    };
    const resultado = crearEventoSchema.safeParse(datosValidos);
    console.log('[TEST 1 OUTPUT] Validación datos válidos:', JSON.stringify(resultado, null, 2));
    expect(resultado.success).toBe(true);
  });

  it('2. Rechazar título vacío o solo espacios', () => {
    const resVacio = crearEventoSchema.safeParse({ titulo: '' });
    const resEspacios = crearEventoSchema.safeParse({ titulo: '   ' });
    console.log('[TEST 2 OUTPUT] Título vacío success:', resVacio.success, '| Solo espacios success:', resEspacios.success);
    expect(resVacio.success).toBe(false);
    expect(resEspacios.success).toBe(false);
  });

  it('3. Rechazar título superior a 200 caracteres', () => {
    const resultado = crearEventoSchema.safeParse({ titulo: 'a'.repeat(201) });
    console.log('[TEST 3 OUTPUT] Título 201 chars success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('4. Rechazar notificaciones activas sin recordatorios', () => {
    const resultado = crearEventoSchema.safeParse({
      notificacionesActivas: true,
      recordatorios: []
    });
    console.log('[TEST 4 OUTPUT] Notificaciones sin recordatorios success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('5. Rechazar enum de prioridad o categoría inválido', () => {
    const resultado = crearEventoSchema.safeParse({ prioridad: 'urgente' });
    console.log('[TEST 5 OUTPUT] Enum inválido success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('6. Rechazar ID menor o igual a 0 en edición', () => {
    const resCero = modificarEventoSchema.safeParse({ id: 0 });
    const resNegativo = modificarEventoSchema.safeParse({ id: -5 });
    console.log('[TEST 6 OUTPUT] ID=0 success:', resCero.success, '| ID=-5 success:', resNegativo.success);
    expect(resCero.success).toBe(false);
    expect(resNegativo.success).toBe(false);
  });

  it('7. Rechazar rango de fechas incoherente', () => {
    const resultado = listarEventosSchema.safeParse({
      desde: new Date('2026-10-10'),
      hasta: new Date('2026-10-01')
    });
    console.log('[TEST 7 OUTPUT] Rango incoherente (desde > hasta) success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('17. Validar fecha de inicio posterior a fecha de fin en DTO', () => {
    const resultado = crearEventoSchema.safeParse({
      fechaInicio: new Date('2026-10-10T12:00:00Z'),
      fechaFin: new Date('2026-10-10T10:00:00Z')
    });
    console.log('[TEST 17 OUTPUT] Fecha inicio > fin success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('18. Validar formato de fecha o Date inválido en DTO', () => {
    const resultado = crearEventoSchema.safeParse({ fechaInicio: 'fecha-invalida' });
    console.log('[TEST 18 OUTPUT] String fecha inválido success:', resultado.success);
    expect(resultado.success).toBe(false);
  });

  it('19. Rechazar recordatorio con cantidad no entera o menor/igual a cero', () => {
    const resCero = crearEventoSchema.safeParse({ recordatorios: [{ cantidad: 0, unidad: 'minutos' }] });
    const resDecimal = crearEventoSchema.safeParse({ recordatorios: [{ cantidad: 1.5, unidad: 'minutos' }] });
    console.log('[TEST 19 OUTPUT] Cantidad 0 success:', resCero.success, '| Cantidad 1.5 success:', resDecimal.success);
    expect(resCero.success).toBe(false);
    expect(resDecimal.success).toBe(false);
  });

  it('20. Rechazar unidad de recordatorio no válida', () => {
    const resultado = crearEventoSchema.safeParse({
      recordatorios: [{ cantidad: 10, unidad: 'dias' }]
    });
    console.log('[TEST 20 OUTPUT] Unidad inválida "dias" success:', resultado.success);
    expect(resultado.success).toBe(false);
  });
});