import { CrearArchivo } from '../logicaPersistente/gestionMaterialEstudio/crearArchivo';
import { BuscarArchivos } from '../logicaPersistente/gestionMaterialEstudio/buscarArchivos';
import { ModificarArchivo } from '../logicaPersistente/gestionMaterialEstudio/modificarArchivo';
import { EliminarArchivo } from '../logicaPersistente/gestionMaterialEstudio/eliminarArchivo';
import { MoverArchivos } from '../logicaPersistente/gestionMaterialEstudio/moverArchivos';
import { ObtenerArchivo } from '../logicaPersistente/gestionMaterialEstudio/obtenerArchivo';
import { ActualizarContenidoArchivo } from '../logicaPersistente/gestionMaterialEstudio/actualizarContenidoArchivo';
import { Archivo } from '../logicaPersistente/gestionMaterialEstudio/entidades';
import {
  CrearArchivoDTO,
  BuscadorArchivoDTO,
  ModificarArchivoDTO,
  EliminarArchivoDTO,
  MoverArchivosDTO,
  ObtenerArchivoDTO,
  AbrirExternoDTO,
} from '../logicaPersistente/gestionMaterialEstudio/dto';

// Punto de entrada único al módulo de archivos — IPC nunca llama a las clases de lógica directo.
export class Archivos {
  constructor(
    private readonly crearArchivo: CrearArchivo,
    private readonly buscarArchivos: BuscarArchivos,
    private readonly modificarArchivo: ModificarArchivo,
    private readonly eliminarArchivo: EliminarArchivo,
    private readonly moverArchivos: MoverArchivos,
    private readonly obtenerArchivo: ObtenerArchivo,
    private readonly actualizarContenidoArchivo: ActualizarContenidoArchivo
  ) {}

  async crear(datos: CrearArchivoDTO): Promise<Archivo> {
    return this.crearArchivo.ejecutar(datos);
  }
  async buscar(criterios: BuscadorArchivoDTO): Promise<Archivo[]> {
    return this.buscarArchivos.ejecutar(criterios);
  }
  async modificar(datos: ModificarArchivoDTO): Promise<Archivo> {
    return this.modificarArchivo.ejecutar(datos);
  }
  async eliminar(datos: EliminarArchivoDTO): Promise<void> {
    return this.eliminarArchivo.ejecutar(datos);
  }
  async mover(datos: MoverArchivosDTO): Promise<Archivo[]> {
    return this.moverArchivos.ejecutar(datos);
  }
  async obtener(datos: ObtenerArchivoDTO): Promise<Archivo> {
    return this.obtenerArchivo.ejecutar(datos);
  }
  async actualizarContenido(id: number, rutaOrigen: string): Promise<Archivo> {
    return this.actualizarContenidoArchivo.ejecutar(id, rutaOrigen);
  }

  async abrirExterno(datos: { id: number }): Promise<void> {
    const archivo = await this.obtenerArchivo.ejecutar({ id: datos.id });
    const ruta = archivo.rutaFisica;
    if (!ruta) throw new Error(`El archivo con id ${datos.id} no tiene ruta física.`);
    const { shell } = await import('electron');
    await shell.openPath(ruta);
  }

}