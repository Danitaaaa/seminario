import { CrearArchivo } from '../logicaPersistente/gestionMaterialEstudio/CrearArchivo';
import { BuscarArchivos } from '../logicaPersistente/gestionMaterialEstudio/buscarArchivos';
import { ModificarArchivo } from '../logicaPersistente/gestionMaterialEstudio/ModificarArchivo';
import { EliminarArchivo } from '../logicaPersistente/gestionMaterialEstudio/EliminarArchivo';
import { MoverArchivos } from '../logicaPersistente/gestionMaterialEstudio/MoverArchivos';
import { ObtenerArchivo } from '../logicaPersistente/gestionMaterialEstudio/ObtenerArchivo';
import { ActualizarContenidoArchivo } from '../logicaPersistente/gestionMaterialEstudio/ActualizarContenidoArchivo';
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
  async actualizarContenido(id: number, tamanio: number): Promise<Archivo> {
    return this.actualizarContenidoArchivo.ejecutar(id, tamanio);
  }

  async abrirExterno(datos: { id: number }): Promise<void> {
    const archivo = await this.obtenerArchivo.ejecutar({ id: datos.id });
    const ruta = archivo.rutaFisica;
    if (!ruta) throw new Error(`El archivo con id ${datos.id} no tiene ruta física.`);
    const { shell } = await import('electron');
    await shell.openPath(ruta);
  }

}