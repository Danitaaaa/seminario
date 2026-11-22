import { CrearHorario } from '../logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from '../logicaPersistente/gestionDeHorarios/listarHorarios';
import { ModificarHorario } from '../logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from '../logicaPersistente/gestionDeHorarios/eliminarHorario';
import { AsignarCuatrimestre } from '../logicaPersistente/gestionDeHorarios/asignarCuatrimestre';
import { HorarioCursado } from '../logicaPersistente/gestionDeHorarios/entidades';
import {
  CrearHorarioDTO,
  ListarHorariosDTO,
  ModificarHorarioDTO,
  EliminarHorarioDTO,
  AsignarCuatrimestreDTO,
} from '../logicaPersistente/gestionDeHorarios/dto';

export class Horarios {
  constructor(
    private readonly crearHorario: CrearHorario,
    private readonly listarHorarios: ListarHorarios,
    private readonly modificarHorario: ModificarHorario,
    private readonly eliminarHorario: EliminarHorario,
    private readonly asignarCuatrimestre: AsignarCuatrimestre
  ) {}

  async asignar(datos: AsignarCuatrimestreDTO): Promise<{ asignados: number }> {
    return this.asignarCuatrimestre.ejecutar(datos);
  }

  async listar(datos: ListarHorariosDTO): Promise<HorarioCursado[]> {
    return this.listarHorarios.ejecutar(datos);
  }
  async crear(datos: CrearHorarioDTO): Promise<HorarioCursado> {
    return this.crearHorario.ejecutar(datos);
  }

  async modificar(datos: ModificarHorarioDTO): Promise<HorarioCursado> {
    return this.modificarHorario.ejecutar(datos);
  }

  async eliminar(datos: EliminarHorarioDTO): Promise<void> {
    return this.eliminarHorario.ejecutar(datos);
  }
}
