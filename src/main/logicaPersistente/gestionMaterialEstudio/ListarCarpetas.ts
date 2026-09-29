import { Persistencia } from '../../persistencia/Persistencia';

// Lista las carpetas existentes (tipo = 'carpeta') para elegir destino al mover archivos.
export class ListarCarpetas {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<{ id: number; nombre: string }[]> {
    const filas = await this.persistencia.ejecutar(
      `SELECT id, nombre FROM nodos WHERE tipo = 'carpeta' ORDER BY nombre`
    );
    return filas.map((f) => ({ id: f.id, nombre: f.nombre }));
  }
}