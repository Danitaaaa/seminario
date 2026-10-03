import { UsuarioFacialRepositorio } from '../../persistencia/UsuarioFacialRepositorio'
 
export class RegistrarRostro {
  private repositorio = new UsuarioFacialRepositorio()
 
  async ejecutar(
    usuarioId: number,
    embedding: number[]
  ): Promise<{ exito: boolean; mensaje: string }> {
    const valido =
      Array.isArray(embedding) &&
      embedding.length === 128 &&
      embedding.every(Number.isFinite)
 
    if (!valido) {
      return { exito: false, mensaje: 'El embedding recibido no es válido' }
    }
 
    const guardado = await this.repositorio.guardarEmbedding(usuarioId, embedding)
    if (!guardado) {
      return { exito: false, mensaje: 'No se encontró el usuario' }
    }
 
    return { exito: true, mensaje: 'Rostro registrado correctamente' }
  }
}