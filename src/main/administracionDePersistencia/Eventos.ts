import { CrearEvento } from '../logicaPersistente/gestionDeEventos/CrearEvento';
import { ListarEventos } from '../logicaPersistente/gestionDeEventos/ListarEventos';
import { ModificarEvento } from '../logicaPersistente/gestionDeEventos/ModificarEvento';
import { EliminarEvento } from '../logicaPersistente/gestionDeEventos/EliminarEvento';
import { Evento } from '../logicaPersistente/gestionDeEventos/entidades';
import {
  CrearEventoDTO,
  ListarEventosDTO,
  ModificarEventoDTO,
  EliminarEventoDTO,
} from '../logicaPersistente/gestionDeEventos/dto';

export class Eventos {
  constructor(
    private readonly crearEvento: CrearEvento,
    private readonly listarEventos: ListarEventos,
    private readonly modificarEvento: ModificarEvento,
    private readonly eliminarEvento: EliminarEvento
  ) {}

  async crear(datos: CrearEventoDTO): Promise<Evento> {
    return this.crearEvento.ejecutar(datos);
  }

  async listar(datos: ListarEventosDTO): Promise<Evento[]> {
    return this.listarEventos.ejecutar(datos);
  }

  async modificar(datos: ModificarEventoDTO): Promise<Evento> {
    return this.modificarEvento.ejecutar(datos);
  }

  async eliminar(datos: EliminarEventoDTO): Promise<void> {
    return this.eliminarEvento.ejecutar(datos);
  }
}
