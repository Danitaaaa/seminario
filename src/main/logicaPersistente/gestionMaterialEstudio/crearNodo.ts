import { Persistencia } from '../../persistencia/persistencia';
import { Nodo } from './entidades';
import { materializarNodo, desmaterializarNodo } from './materializador';
import { CrearNodoDTO } from './dto';


export class CrearNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Crea un nuevo nodo con el nombre definido por el usuario
    async ejecutar(datos: CrearNodoDTO): Promise<Nodo> {
        if (!datos.nombre.trim()) {
            throw new Error('El nombre de la carpeta no puede estar vacío.');
        }
        try {
            const filas = await this.persistencia.ejecutar(
                `INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso,
                                    ultima_fecha_modificacion, tamaño, id_padre)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [datos.nombre, new Date(), new Date(), new Date(), 0, datos.idPadre]
            );
            return materializarNodo(filas[0]);
        } catch (error: any) {
            if (error.code === '23505') {
                throw new Error(`Ya existe una carpeta llamada "${datos.nombre}" en esta ubicación.`);
            }
            throw error;
        }
    }
}
