import { CrearArchivo } from '../logicaPersistente/gestionDeArchivos/CrearArchivo';
import { ListarArchivos } from '../logicaPersistente/gestionDeArchivos/ListarArchivos';
import { ModificarArchivo } from '../logicaPersistente/gestionDeArchivos/ModificarArchivo';
import { EliminarArchivo } from '../logicaPersistente/gestionDeArchivos/EliminarArchivo';
import { ListarCarpetas } from '../logicaPersistente/gestionDeArchivos/ListarCarpetas';
import { MoverArchivos } from '../logicaPersistente/gestionDeArchivos/MoverArchivos';
import { Archivo } from '../logicaPersistente/gestionDeArchivos/entidades';
import {
  CrearArchivoDTO, ModificarArchivoDTO, EliminarArchivoDTO, MoverArchivosDTO,
} from '../logicaPersistente/gestionDeArchivos/dto';

// Punto de entrada único al módulo de archivos — IPC nunca llama a las clases de lógica directo.
export class Archivos {
  constructor(
    private readonly crearArchivo: CrearArchivo,
    private readonly listarArchivos: ListarArchivos,
    private readonly modificarArchivo: ModificarArchivo,
    private readonly eliminarArchivo: EliminarArchivo,
    private readonly listarCarpetas: ListarCarpetas,
    private readonly moverArchivos: MoverArchivos
  ) {}

  async crear(datos: CrearArchivoDTO): Promise<Archivo> {
    return this.crearArchivo.ejecutar(datos);
  }
  async listar(): Promise<Archivo[]> {
    return this.listarArchivos.ejecutar();
  }
  async modificar(datos: ModificarArchivoDTO): Promise<Archivo> {
    return this.modificarArchivo.ejecutar(datos);
  }
  async eliminar(datos: EliminarArchivoDTO): Promise<void> {
    return this.eliminarArchivo.ejecutar(datos);
  }
  async carpetas(): Promise<{ id: number; nombre: string }[]> {
    return this.listarCarpetas.ejecutar();
  }
  async mover(datos: MoverArchivosDTO): Promise<Archivo[]> {
    return this.moverArchivos.ejecutar(datos);
  }
}