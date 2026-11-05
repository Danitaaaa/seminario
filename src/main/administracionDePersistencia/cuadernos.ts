import { ListarCuadernos } from '../logicaPersistente/gestionDeCuadernos/listarCuadernos';
import { ObtenerCuaderno } from '../logicaPersistente/gestionDeCuadernos/obtenerCuaderno';
import { CrearNota } from '../logicaPersistente/gestionDeCuadernos/crearNota';
import { ModificarNota } from '../logicaPersistente/gestionDeCuadernos/modificarNota';
import { EliminarNota } from '../logicaPersistente/gestionDeCuadernos/eliminarNota';
import { Cuaderno, Nota, ResumenCuaderno } from '../logicaPersistente/gestionDeCuadernos/entidades';
import { CrearNotaDTO, CuadernoDTO, ModificarNotaDTO, NotaDTO, UsuarioDTO } from '../logicaPersistente/gestionDeCuadernos/dto';

export class Cuadernos {
  constructor(
    private readonly listarCuadernos: ListarCuadernos,
    private readonly obtenerCuaderno: ObtenerCuaderno,
    private readonly crearNota: CrearNota,
    private readonly modificarNota: ModificarNota,
    private readonly eliminarNota: EliminarNota
  ) {}

  listar(datos: UsuarioDTO): Promise<ResumenCuaderno[]> { return this.listarCuadernos.ejecutar(datos); }
  obtener(datos: CuadernoDTO): Promise<Cuaderno> { return this.obtenerCuaderno.ejecutar(datos); }
  nuevaNota(datos: CrearNotaDTO): Promise<Nota> { return this.crearNota.ejecutar(datos); }
  editarNota(datos: ModificarNotaDTO): Promise<Nota> { return this.modificarNota.ejecutar(datos); }
  borrarNota(datos: NotaDTO): Promise<void> { return this.eliminarNota.ejecutar(datos); }
}
