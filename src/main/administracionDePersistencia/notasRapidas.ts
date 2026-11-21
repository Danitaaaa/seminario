import { ListarNotas } from '../logicaPersistente/gestionDeNotasRapidas/listarNotas';
import { CrearNota } from '../logicaPersistente/gestionDeNotasRapidas/crearNota';
import { ModificarNota } from '../logicaPersistente/gestionDeNotasRapidas/modificarNota';
import { EliminarNota } from '../logicaPersistente/gestionDeNotasRapidas/eliminarNota';
import { NotaRapida } from '../logicaPersistente/gestionDeNotasRapidas/entidades';
import { CrearNotaDTO, EliminarNotaDTO, ListarNotasDTO, ModificarNotaDTO } from '../logicaPersistente/gestionDeNotasRapidas/dto';

// Punto de entrada único al módulo de notas rápidas (post-its de las carpetas).
export class NotasRapidas {
  constructor(
    private readonly listarNotas: ListarNotas,
    private readonly crearNota: CrearNota,
    private readonly modificarNota: ModificarNota,
    private readonly eliminarNota: EliminarNota
  ) {}

  async listar(datos: ListarNotasDTO): Promise<NotaRapida[]> {
    return this.listarNotas.ejecutar(datos);
  }
  async crear(datos: CrearNotaDTO): Promise<NotaRapida> {
    return this.crearNota.ejecutar(datos);
  }
  async modificar(datos: ModificarNotaDTO): Promise<NotaRapida> {
    return this.modificarNota.ejecutar(datos);
  }
  async eliminar(datos: EliminarNotaDTO): Promise<void> {
    return this.eliminarNota.ejecutar(datos);
  }
}
