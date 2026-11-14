import { Persistencia } from '../../persistencia/persistencia';
import { MaterialIACuadernoDTO } from './dto';

// Agrega a un cuaderno un cuestionario, mapa mental o resumen hecho con IA: le asigna la materia del cuaderno.
export class AgregarMaterialIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MaterialIACuadernoDTO): Promise<void> {
    const filas = await this.persistencia.ejecutar(
      `UPDATE materiales_ia m SET id_materia = c.id_materia
         FROM cuaderno c
        WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND m.id_material_ia = $3 AND m.id_usuario = $2
        RETURNING m.id_material_ia`,
      [datos.idCuaderno, datos.usuarioId, datos.idMaterialIA]
    );
    if (filas.length === 0) throw new Error('El cuaderno o el material no existen.');
  }
}

// Lo saca del cuaderno: le quita la materia. El material no se borra.
export class QuitarMaterialIA {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(datos: MaterialIACuadernoDTO): Promise<void> {
    await this.persistencia.ejecutar(
      `UPDATE materiales_ia m SET id_materia = NULL
         FROM cuaderno c
        WHERE c.id_cuaderno = $1 AND c.id_usuario = $2 AND m.id_material_ia = $3 AND m.id_usuario = $2
          AND m.id_materia = c.id_materia`,
      [datos.idCuaderno, datos.usuarioId, datos.idMaterialIA]
    );
  }
}
