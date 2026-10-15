import { UsuarioFacialRepositorio } from '../../persistencia/usuarioFacialRepositorio'
 
const UMBRAL_COINCIDENCIA = 0.5
 
type ResultadoLogin =
  | { exito: true; usuarioId: number }
  | { exito: false; mensaje: string }
 
export class LoginFacial {
  private repositorio = new UsuarioFacialRepositorio()
 
  async ejecutar(embedding: number[]): Promise<ResultadoLogin> {
    const embeddingValido =
      Array.isArray(embedding) &&
      embedding.length === 128 &&
      embedding.every(Number.isFinite)
    if (!embeddingValido) {
      return { exito: false, mensaje: 'El embedding recibido no es válido' }
    }
 
    const rostrosGuardados = await this.repositorio.obtenerEmbeddings()
    if (rostrosGuardados.length === 0) {
      return { exito: false, mensaje: 'Todavía no hay rostros registrados' }
    }
 
    let usuarioIdMasCercano: number | null = null
    let distanciaMasCercana = UMBRAL_COINCIDENCIA

    for (const rostroGuardado of rostrosGuardados) {
      const distanciaActual = this.distancia(embedding, rostroGuardado.embedding)
      if (distanciaActual < distanciaMasCercana) {
        distanciaMasCercana = distanciaActual
        usuarioIdMasCercano = rostroGuardado.usuarioId
      }
    }
 
    if (usuarioIdMasCercano !== null) {
      return { exito: true, usuarioId: usuarioIdMasCercano }
    }
    return { exito: false, mensaje: 'No se reconoció el rostro' }
  }
 
  private distancia(embeddingNuevo: number[], embeddingGuardado: number[]): number {
    let suma = 0
    for (let i = 0; i < embeddingNuevo.length; i++) {
      const diferencia = embeddingNuevo[i] - embeddingGuardado[i]
      suma += diferencia * diferencia
    }
    return Math.sqrt(suma)
  }
}