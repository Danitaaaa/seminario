import { Persistencia } from '../../persistencia/persistencia';
import { MateriaFormacion } from './entidades';
import { materializarMateria } from './materializador';
import { CrearMateriasDTO } from './dto';
import { traducirError } from './errores';

// Agrega una o varias materias a una formación (a mano o desde el plan).
// Se guardan todas o ninguna: si una falla, por ejemplo por un nombre repetido, no se guarda nada.
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
        return creadas;
      });
    } catch (error) {
      throw traducirError(error);
    }
  }
}
