import { IPersistenciaProyectos } from '../gestionDeProyectos/interfacesSincronizacion';
import { exigirAcceso, registrarCambioSiProyecto } from '../gestionDeProyectos/alcance';
import { Categoria } from './entidades';
import { COLUMNAS_CATEGORIA, materializarCategoria } from './materializador';
import { crearCategoriaSchema, CrearCategoriaDTO } from './dto';

export class CrearCategoria {
  constructor(private readonly persistencia: IPersistenciaProyectos) {}

  async ejecutar(entrada: CrearCategoriaDTO): Promise<Categoria> {
    const dto = crearCategoriaSchema.parse(entrada);
    const idProyecto = dto.idProyecto ?? null;
    // Personal: dueño = usuario. De proyecto: editor o propietario.
    await exigirAcceso(this.persistencia, idProyecto, dto.usuarioId, dto.usuarioId, 'categoria.crear');

    return this.persistencia.transaccion(async tx => {
      let filas;
      try {
        filas = await tx.ejecutar(
          `INSERT INTO categorias (usuario_id, id_proyecto, nombre) VALUES ($1, $2, $3)
           RETURNING ${COLUMNAS_CATEGORIA}`,
          [idProyecto === null ? dto.usuarioId : null, idProyecto, dto.nombre]);
      } catch (e: any) {
        if (e?.code === '23505') throw new Error('Ya existe una categoría con ese nombre');
        throw e;
      }
      const c = materializarCategoria(filas[0]);
      // registrarCambioSiProyecto agrega idGlobal al payload; no hace nada si es personal.
      await registrarCambioSiProyecto(tx, idProyecto, 'categoria', c.id, 'crear', { datos: { nombre: c.nombre } });
      return c;
    });
  }
}