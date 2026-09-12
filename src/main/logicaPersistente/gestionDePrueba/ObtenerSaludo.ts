import { Persistencia } from '../../persistencia/Persistencia';
import { Saludo } from './entidades';
import { materializarSaludo } from './materializador';

export class ObtenerSaludo {
  constructor(private readonly persistencia: Persistencia) {}

  async ultimo(): Promise<Saludo | null> {
    const filas = await this.persistencia.ejecutar(
      `SELECT * FROM saludos ORDER BY id DESC LIMIT 1`
    );
    return filas.length > 0 ? materializarSaludo(filas[0]) : null;
  }
}
