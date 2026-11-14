import { Persistencia } from '../../persistencia/persistencia';
import { leerCuestionarioGuardado } from '../../logicaNoPersistente/ia/esquemas';
import { IntentoCuestionario } from './entidades';
import { materializarIntentoCuestionario } from './materializador';
import { ObtenerMaterialIA } from './obtenerMaterialIA';
import { corregirCuestionario, type RespuestaUsuario, type ResultadoCorreccion } from './corregirCuestionario';

// Corrige las respuestas contra el cuestionario guardado y deja registrado el intento.
export class ResponderCuestionario {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly obtenerMaterial: ObtenerMaterialIA,
  ) {}

  async ejecutar(
    idUsuario: number,
    idMaterialIA: number,
    respuestas: RespuestaUsuario[],
  ): Promise<ResultadoCorreccion & { idIntento: number }> {
    const material = await this.obtenerMaterial.ejecutar(idUsuario, idMaterialIA);
    if (material.tipo !== 'cuestionario') throw new Error('Ese material no es un cuestionario.');
    const cuestionario = leerCuestionarioGuardado(material.contenido);
    if (respuestas.length !== cuestionario.preguntas.length) {
      throw new Error('La cantidad de respuestas no coincide con la de preguntas.');
    }

    const resultado = corregirCuestionario(cuestionario, respuestas);
    const filas = await this.persistencia.ejecutar(
      `INSERT INTO intentos_cuestionario (id_material_ia, id_usuario, respuestas, correctas, total, temas_a_reforzar)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb)
       RETURNING id_intento`,
      [
        idMaterialIA,
        idUsuario,
        JSON.stringify(respuestas),
        resultado.correctas,
        resultado.total,
        JSON.stringify(resultado.temasAReforzar),
      ],
    );
    return { ...resultado, idIntento: filas[0].id_intento };
  }
}

// Historial de intentos de un cuestionario, el más nuevo primero.
export class ListarIntentosCuestionario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, idMaterialIA: number): Promise<IntentoCuestionario[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM intentos_cuestionario
       WHERE id_material_ia = $1 AND id_usuario = $2
       ORDER BY fecha DESC`,
      [idMaterialIA, idUsuario],
    );
    return filas.map(materializarIntentoCuestionario);
  }
}
