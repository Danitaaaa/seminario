import { ObtenerSaludo } from '../logicaPersistente/gestionDePrueba/ObtenerSaludo';
import { Saludo } from '../logicaPersistente/gestionDePrueba/entidades';

export class Prueba {
  constructor(private readonly obtenerSaludo: ObtenerSaludo) {}

  async obtenerUltimoSaludo(): Promise<Saludo | null> {
    return this.obtenerSaludo.ultimo();
  }
}
