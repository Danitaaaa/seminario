import { ipcMain } from 'electron';
import type { ZodType } from 'zod';
import { Materias } from '../administracionDePersistencia/materias';
import {
  crearFormacionSchema, crearMateriasSchema, formacionSchema, guardarCorrelativasSchema, leerPlanSchema, materiaSchema,
  modificarFormacionSchema, modificarMateriaSchema, usuarioSchema,
} from '../logicaPersistente/gestionDeMaterias/dto';

function validar<T>(schema: ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? 'Datos inválidos.');
  return resultado.data;
}

export function registerMateriasIpc(materias: Materias): void {
  ipcMain.handle('materias:formaciones', (_e, d: unknown) => materias.formaciones(validar(usuarioSchema, d)));
  ipcMain.handle('materias:crearFormacion', (_e, d: unknown) => materias.nuevaFormacion(validar(crearFormacionSchema, d)));
  ipcMain.handle('materias:modificarFormacion', (_e, d: unknown) => materias.editarFormacion(validar(modificarFormacionSchema, d)));
  ipcMain.handle('materias:eliminarFormacion', async (_e, d: unknown) => {
    await materias.borrarFormacion(validar(formacionSchema, d));
    return { ok: true };
  });

  ipcMain.handle('materias:listar', (_e, d: unknown) => materias.materias(validar(formacionSchema, d)));
  ipcMain.handle('materias:crear', (_e, d: unknown) => materias.nuevasMaterias(validar(crearMateriasSchema, d)));
  ipcMain.handle('materias:modificar', (_e, d: unknown) => materias.editarMateria(validar(modificarMateriaSchema, d)));
  ipcMain.handle('materias:eliminar', async (_e, d: unknown) => {
    await materias.borrarMateria(validar(materiaSchema, d));
    return { ok: true };
  });

  ipcMain.handle('materias:delUsuario', (_e, d: unknown) => materias.todasLasMaterias(validar(usuarioSchema, d)));

  ipcMain.handle('materias:correlativas', (_e, d: unknown) => materias.correlativas(validar(formacionSchema, d)));
  ipcMain.handle('materias:guardarCorrelativas', (_e, d: unknown) => materias.editarCorrelativas(validar(guardarCorrelativasSchema, d)));

  ipcMain.handle('materias:leerPlan', (_e, d: unknown) => materias.leerPlan(validar(leerPlanSchema, d)));
}
