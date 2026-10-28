import { describe, it, expect } from 'vitest';
import { crearSesionEstudioSchema } from '../../logicaPersistente/gestionDeSesionEstudio/dto';

const sesionValida = {
  nombre: 'Repaso parcial',
  idMateria: 3,
  duracion: 60,
  fechaProgramada: '2026-10-28T18:00:00.000Z',
};

describe('Validaciones al crear una sesión (dto.ts)', () => {
  it('1. Acepta una sesión válida y completa los valores por defecto del Pomodoro', () => {
    const r = crearSesionEstudioSchema.safeParse(sesionValida);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.pomodoroMin).toBe(35);
    expect(r.data.descansoCortoMin).toBe(10);
    expect(r.data.descansoLargoMin).toBe(15);
  });

  it('2. Rechaza un nombre vacío o solo con espacios', () => {
    expect(crearSesionEstudioSchema.safeParse({ ...sesionValida, nombre: '' }).success).toBe(false);
    expect(crearSesionEstudioSchema.safeParse({ ...sesionValida, nombre: '   ' }).success).toBe(false);
  });

  it('3. Rechaza una sesión sin materia', () => {
    const { idMateria: _sinMateria, ...sinMateria } = sesionValida;
    expect(crearSesionEstudioSchema.safeParse(sinMateria).success).toBe(false);
  });

  it('4. Rechaza una duración fuera de rango (1 a 720 minutos)', () => {
    expect(crearSesionEstudioSchema.safeParse({ ...sesionValida, duracion: 0 }).success).toBe(false);
    expect(crearSesionEstudioSchema.safeParse({ ...sesionValida, duracion: 721 }).success).toBe(false);
    expect(crearSesionEstudioSchema.safeParse({ ...sesionValida, duracion: 720 }).success).toBe(true);
  });
});