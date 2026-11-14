import { test, expect } from 'vitest';
import { ProcesoSesionEstudio } from '../../logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import { tienePracticaActiva } from '../../logicaNoPersistente/procesoSesionEstudio/practicaActiva';
import type { SesionEstudio } from '../../logicaPersistente/gestionDeSesionEstudio/entidades';

// Sesión en curso que empezó hace `minutosEstudiados` minutos.
function sesionEnCurso(minutosEstudiados: number, metodos: string[], cambios: Partial<SesionEstudio> = {}): SesionEstudio {
  return {
    idSesion: 7,
    idUsuario: 1,
    nombre: 'Parcial',
    duracion: 30,
    materiaAsociada: { idMateria: 1, nombre: 'Física' },
    metodosEstudio: metodos.map((nombre, i) => ({ idTipoMetodoEstudio: i + 1, nombre })),
    estado: 'en_curso',
    fechaInicio: new Date(Date.now() - minutosEstudiados * 60_000),
    fechaPausa: null,
    pausada: false,
    segundosPausados: 0,
    pomodoroMin: 25,
    descansoCortoMin: 5,
    descansoLargoMin: 15,
    pomodoro: { fase: 'pomodoro', restanteSeg: null, corriendoDesde: null, completados: 0 },
    ...cambios,
  } as SesionEstudio;
}

const proceso = () => new ProcesoSesionEstudio({} as never, () => undefined);

test('práctica activa: se reconoce sin importar mayúsculas ni tildes', () => {
  expect(tienePracticaActiva([{ nombre: 'Práctica Activa' }])).toBe(true);
  expect(tienePracticaActiva([{ nombre: 'practica activa' }, { nombre: 'Flashcards' }])).toBe(true);
  expect(tienePracticaActiva([{ nombre: 'Flashcards' }])).toBe(false);
});

test('práctica activa: no se puede salir antes de cumplir la duración', () => {
  const p = proceso();
  p.seguir(sesionEnCurso(10, ['Práctica activa']));
  expect(p.obtenerSnapshot()?.salidaBloqueada).toBe(true);
  expect(p.salidaBloqueada()).toBe(true);
  expect(p.salidaBloqueada(7)).toBe(true);
  expect(p.salidaBloqueada(8)).toBe(false); // otra sesión
});

test('práctica activa: al cumplir la duración se puede salir', () => {
  const p = proceso();
  p.seguir(sesionEnCurso(31, ['Práctica activa']));
  expect(p.salidaBloqueada()).toBe(false);
});

test('práctica activa: el tiempo pausado no cuenta', () => {
  const p = proceso();
  p.seguir(sesionEnCurso(40, ['Práctica activa'], { segundosPausados: 15 * 60 }));
  expect(p.salidaBloqueada()).toBe(true);
});

test('práctica activa: sin ese método, o sin sesión en curso, no hay bloqueo', () => {
  const p = proceso();
  expect(p.salidaBloqueada()).toBe(false);
  p.seguir(sesionEnCurso(5, ['Flashcards']));
  expect(p.salidaBloqueada()).toBe(false);
  p.dejarDeSeguir();
  expect(p.salidaBloqueada()).toBe(false);
});
