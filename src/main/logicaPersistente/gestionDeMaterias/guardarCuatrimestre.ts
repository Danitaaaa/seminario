import { Persistencia } from '../../persistencia/persistencia';
import { CuatrimestreCursada } from './entidades';
import { GuardarCuatrimestreDTO } from './dto';
import { ListarCuatrimestres } from './listarCuatrimestres';

// Crea o edita un cuatrimestre con sus fechas y recesos (los recesos se reemplazan enteros).
// Al crearlo puede copiar los horarios de otro cuatrimestre del usuario.
export class GuardarCuatrimestre {
  constructor(private readonly persistencia: Persistencia, private readonly listar: ListarCuatrimestres) {}

  async ejecutar(datos: GuardarCuatrimestreDTO): Promise<CuatrimestreCursada> {
    const id = await this.persistencia.transaccion(async (tx) => {
      // Dos cuatrimestres no pueden pisarse en fechas (salvo el mismo que se está editando).
      const pisados = await tx.ejecutar<{ anio: number; tipo: string }>(
        `SELECT anio, tipo FROM cuatrimestre
          WHERE id_usuario = $1 AND ($2::int IS NULL OR id_cuatrimestre <> $2)
            AND fecha_inicio <= $4::date AND fecha_fin >= $3::date`,
        [datos.usuarioId, datos.idCuatrimestre ?? null, datos.fechaInicio, datos.fechaFin]
      );
      if (pisados.length > 0) {
        const p = pisados[0];
        throw new Error(`Las fechas se pisan con el ${p.tipo === 'primero' ? '1°' : '2°'} cuatrimestre ${p.anio}.`);
      }

      let idCuatrimestre = datos.idCuatrimestre;
      try {
        if (idCuatrimestre) {
          const filas = await tx.ejecutar(
            `UPDATE cuatrimestre SET anio = $3, tipo = $4, fecha_inicio = $5, fecha_fin = $6
              WHERE id_cuatrimestre = $1 AND id_usuario = $2 RETURNING id_cuatrimestre`,
            [idCuatrimestre, datos.usuarioId, datos.anio, datos.tipo, datos.fechaInicio, datos.fechaFin]
          );
          if (filas.length === 0) throw new Error('El cuatrimestre no existe.');
          await tx.ejecutar(`DELETE FROM cuatrimestre_receso WHERE id_cuatrimestre = $1`, [idCuatrimestre]);
        } else {
          const filas = await tx.ejecutar<{ id_cuatrimestre: number }>(
            `INSERT INTO cuatrimestre (id_usuario, anio, tipo, fecha_inicio, fecha_fin)
             VALUES ($1, $2, $3, $4, $5) RETURNING id_cuatrimestre`,
            [datos.usuarioId, datos.anio, datos.tipo, datos.fechaInicio, datos.fechaFin]
          );
          idCuatrimestre = filas[0].id_cuatrimestre;
        }
      } catch (error: any) {
        if (error?.code === '23505') throw new Error(`Ya tenés cargado ese cuatrimestre de ${datos.anio}.`);
        throw error;
      }

      for (const r of datos.recesos) {
        await tx.ejecutar(
          `INSERT INTO cuatrimestre_receso (id_cuatrimestre, desde, hasta, descripcion) VALUES ($1, $2, $3, $4)`,
          [idCuatrimestre, r.desde, r.hasta, r.descripcion]
        );
      }

      if (!datos.idCuatrimestre && datos.copiarHorariosDe) {
        await tx.ejecutar(
          `INSERT INTO horarios_cursado (usuario_id, dia_semana, hora_inicio, hora_fin, titulo, tono, id_materia, id_cuatrimestre)
           SELECT h.usuario_id, h.dia_semana, h.hora_inicio, h.hora_fin, h.titulo, h.tono, h.id_materia, $3
             FROM horarios_cursado h JOIN cuatrimestre c ON c.id_cuatrimestre = h.id_cuatrimestre
            WHERE h.id_cuatrimestre = $2 AND c.id_usuario = $1`,
          [datos.usuarioId, datos.copiarHorariosDe, idCuatrimestre]
        );
      }
      return idCuatrimestre!;
    });

    const [cuatrimestre] = await this.listar.ejecutar({ usuarioId: datos.usuarioId }, id);
    return cuatrimestre;
  }
}
