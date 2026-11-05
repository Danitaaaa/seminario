import { Persistencia } from '../../persistencia/persistencia';
import { MateriaFormacion } from './entidades';
import { materializarMateria } from './materializador';
import { CrearMateriasDTO } from './dto';
import { traducirError } from './errores';

// Agrega una o varias materias a una formación (a mano o desde el plan).
// Se guardan todas o ninguna: si una falla, por ejemplo por un nombre repetido, no se guarda nada.
// Las correlativas se buscan por nombre; las que no aparecen o armarían un círculo se saltean.
export class CrearMaterias {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: CrearMateriasDTO): Promise<MateriaFormacion[]> {
    const nombres = datos.materias.map((m) => m.nombre.toLowerCase());
    // Se muestra el nombre como está escrito la primera vez que aparece.
    const repetida = nombres.findIndex((n, i) => nombres.indexOf(n) !== i);
    if (repetida !== -1) throw new Error(`La materia "${datos.materias[nombres.indexOf(nombres[repetida])].nombre}" está repetida.`);

    try {
      return await this.persistencia.transaccion(async (tx) => {
        const formacion = await tx.ejecutar(
          `SELECT 1 FROM formacion WHERE id_formacion = $1 AND id_usuario = $2`,
          [datos.idFormacion, datos.usuarioId]
        );
        if (formacion.length === 0) throw new Error('La formación no existe.');

        const creadas: MateriaFormacion[] = [];
        for (const m of datos.materias) {
          const filas = await tx.ejecutar(
            `INSERT INTO materia (id_formacion, nombre, anio, cuatrimestre, estado)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [datos.idFormacion, m.nombre, m.anio, m.cuatrimestre, m.estado]
          );
          creadas.push(materializarMateria(filas[0]));
        }
        await this.guardarCorrelativas(tx, datos, creadas);
        return creadas;
      });
    } catch (error) {
      throw traducirError(error);
    }
  }

  private async guardarCorrelativas(tx: Persistencia, datos: CrearMateriasDTO, creadas: MateriaFormacion[]): Promise<void> {
    if (!datos.materias.some((m) => m.correlativas.length > 0)) return;
    const todas = await tx.ejecutar<{ id_materia: number; nombre: string }>(
      `SELECT id_materia, nombre FROM materia WHERE id_formacion = $1`,
      [datos.idFormacion]
    );
    const porNombre = new Map(todas.map((m) => [normalizar(m.nombre), m.id_materia]));

    for (const [i, m] of datos.materias.entries()) {
      const idMateria = creadas[i].idMateria;
      for (const nombre of m.correlativas) {
        const idRequisito = porNombre.get(normalizar(nombre));
        if (!idRequisito || idRequisito === idMateria) continue;
        const circulo = await tx.ejecutar(
          `WITH RECURSIVE necesarias AS (
             SELECT $2::int AS id_requisito
             UNION
             SELECT c.id_requisito FROM materia_correlativa c JOIN necesarias n ON c.id_materia = n.id_requisito
           )
           SELECT 1 FROM necesarias WHERE id_requisito = $1 LIMIT 1`,
          [idMateria, idRequisito]
        );
        if (circulo.length > 0) continue;
        await tx.ejecutar(
          `INSERT INTO materia_correlativa (id_materia, id_requisito) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [idMateria, idRequisito]
        );
      }
    }
  }
}

// Para comparar nombres sin importar mayúsculas, acentos ni espacios de más.
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
