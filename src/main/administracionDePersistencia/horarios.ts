import { CrearHorario } from '../logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from '../logicaPersistente/gestionDeHorarios/listarHorarios';
import { ModificarHorario } from '../logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from '../logicaPersistente/gestionDeHorarios/eliminarHorario';
import { HorarioCursado } from '../logicaPersistente/gestionDeHorarios/entidades';
import {
  CrearHorarioDTO,
  ListarHorariosDTO,
  ModificarHorarioDTO,
  EliminarHorarioDTO,
} from '../logicaPersistente/gestionDeHorarios/dto';

export class Horarios {
  constructor(
    private readonly crearHorario: CrearHorario,
    private readonly listarHorarios: ListarHorarios,
    private readonly modificarHorario: ModificarHorario,
    private readonly eliminarHorario: EliminarHorario
  ) {}

  async crear(datos: CrearHorarioDTO): Promise<HorarioCursado> {
    return this.crearHorario.ejecutar(datos);
  }

  async listar(datos: ListarHorariosDTO): Promise<HorarioCursado[]> {
    return this.listarHorarios.ejecutar(datos);
  }

  async modificar(datos: ModificarHorarioDTO): Promise<HorarioCursado> {
    return this.modificarHorario.ejecutar(datos);
  }

  async eliminar(datos: EliminarHorarioDTO): Promise<void> {
    return this.eliminarHorario.ejecutar(datos);
  }
}
