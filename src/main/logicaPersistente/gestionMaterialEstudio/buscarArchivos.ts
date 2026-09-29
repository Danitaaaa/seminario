import { BuscadorArchivoDTO } from './dto';
import { materializarArchivo } from './materializador';
import { Persistencia } from '../../persistencia/Persistencia';
import { Archivo } from './entidades';

const COLUMNAS: Record<NonNullable<BuscadorArchivoDTO['ordenarPor']>, string> = {
  nombre: 'nombre',
  fecha_carga: 'fecha_carga',
  fecha_ultimo_acceso: 'ultima_fecha_acceso',
  fecha_ultima_modificacion: 'ultima_fecha_modificacion',
  tamaño: 'tamaño',
};

export class BuscarArchivos {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(criterios: BuscadorArchivoDTO): Promise<Archivo[]> {
    const columna = COLUMNAS[criterios.ordenarPor ?? 'nombre'];
    const direccion = criterios.direccion === 'DESC' ? 'DESC' : 'ASC';

    if (!criterios.busqueda) {
      const filas = await this.persistencia.ejecutar(
        `SELECT * FROM archivos
         WHERE id_padre = $1
         ORDER BY ${columna} ${direccion}`,
        [criterios.idPadre]
      );
      return filas.map(materializarArchivo);
    }

    const orden = columna === 'nombre' ? 'score DESC' : `${columna} ${direccion}`;

    const filas = await this.persistencia.ejecutar(
      `SELECT *, similarity(nombre, $1) AS score
       FROM archivos
       WHERE id_padre = $2 AND similarity(nombre, $1) > $3
       ORDER BY ${orden}`,
      [criterios.busqueda, criterios.idPadre, criterios.umbral ?? 0.2]
    );
    return filas.map(materializarArchivo);
  }
}