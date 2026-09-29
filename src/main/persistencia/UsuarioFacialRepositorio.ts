import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export interface EmbeddingGuardado {
  usuarioId: string
  embedding: number[]
}
 
export class UsuarioFacialRepositorio {
  async guardarEmbedding(usuarioId: string, embedding: number[]): Promise<boolean> {
    const resultado = await pool.query(
      'UPDATE usuarios SET embedding_facial = $1 WHERE id = $2',
      [embedding, usuarioId]
    )
    return (resultado.rowCount ?? 0) > 0
  }
 
  async obtenerEmbeddings(): Promise<EmbeddingGuardado[]> {
    const resultado = await pool.query(
      'SELECT id, embedding_facial FROM usuarios WHERE embedding_facial IS NOT NULL AND email_verificado = true'
    )
    return resultado.rows.map((fila) => ({
      usuarioId: fila.id,
      embedding: fila.embedding_facial
    }))
  }
}