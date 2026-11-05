import { ListarCuadernos } from '../logicaPersistente/gestionDeCuadernos/listarCuadernos';
import { ObtenerCuaderno } from '../logicaPersistente/gestionDeCuadernos/obtenerCuaderno';
import { CrearCuaderno } from '../logicaPersistente/gestionDeCuadernos/crearCuaderno';
import { ModificarCuaderno } from '../logicaPersistente/gestionDeCuadernos/modificarCuaderno';
import { EliminarCuaderno } from '../logicaPersistente/gestionDeCuadernos/eliminarCuaderno';
import { CrearNota } from '../logicaPersistente/gestionDeCuadernos/crearNota';
import { ModificarNota } from '../logicaPersistente/gestionDeCuadernos/modificarNota';
import { EliminarNota } from '../logicaPersistente/gestionDeCuadernos/eliminarNota';
import { AgregarMazo } from '../logicaPersistente/gestionDeCuadernos/agregarMazo';
import { QuitarMazo } from '../logicaPersistente/gestionDeCuadernos/quitarMazo';
import { Cuaderno, Nota, ResumenCuaderno } from '../logicaPersistente/gestionDeCuadernos/entidades';
import {
  CrearCuadernoDTO, CrearNotaDTO, CuadernoDTO, MazoCuadernoDTO, ModificarCuadernoDTO, ModificarNotaDTO, NotaDTO, UsuarioDTO,
} from '../logicaPersistente/gestionDeCuadernos/dto';

export class Cuadernos {
  constructor(
    private readonly listarCuadernos: ListarCuadernos,
    private readonly obtenerCuaderno: ObtenerCuaderno,
    private readonly crearCuaderno: CrearCuaderno,
    private readonly modificarCuaderno: ModificarCuaderno,
    private readonly eliminarCuaderno: EliminarCuaderno,
    private readonly crearNota: CrearNota,
    private readonly modificarNota: ModificarNota,
    private readonly eliminarNota: EliminarNota,
    private readonly agregarMazo: AgregarMazo,
    private readonly quitarMazo: QuitarMazo
  ) {}

  listar(datos: UsuarioDTO): Promise<ResumenCuaderno[]> { return this.listarCuadernos.ejecutar(datos); }
  obtener(datos: CuadernoDTO): Promise<Cuaderno> { return this.obtenerCuaderno.ejecutar(datos); }
  nuevo(datos: CrearCuadernoDTO): Promise<{ idCuaderno: number }> { return this.crearCuaderno.ejecutar(datos); }
  editar(datos: ModificarCuadernoDTO): Promise<void> { return this.modificarCuaderno.ejecutar(datos); }
  borrar(datos: CuadernoDTO): Promise<void> { return this.eliminarCuaderno.ejecutar(datos); }

  nuevaNota(datos: CrearNotaDTO): Promise<Nota> { return this.crearNota.ejecutar(datos); }
  editarNota(datos: ModificarNotaDTO): Promise<Nota> { return this.modificarNota.ejecutar(datos); }
  borrarNota(datos: NotaDTO): Promise<void> { return this.eliminarNota.ejecutar(datos); }

  sumarMazo(datos: MazoCuadernoDTO): Promise<void> { return this.agregarMazo.ejecutar(datos); }
  sacarMazo(datos: MazoCuadernoDTO): Promise<void> { return this.quitarMazo.ejecutar(datos); }
}
