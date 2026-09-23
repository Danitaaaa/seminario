import { Persistencia } from '../../persistencia/Persistencia';
import { Nodo } from './entidades';
import { materializarNodo, desmaterializarNodo } from './materializador';
import { CrearNodoDTO } from './dto';


export class CrearNodo {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: CrearNodoDTO): Promise<Nodo> {
        const filas = await this.persistencia.ejecutar(
            `INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso, 
                                    ultima_fecha_modificacion, tamaño, id_padre)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [datos.nombre, new Date(), new Date(), new Date(), 0, datos.idPadre]
        );
        return materializarNodo(filas[0]);
    }
}
