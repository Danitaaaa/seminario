import { Persistencia } from '../../persistencia/Persistencia';
import { Nodo } from './entidades';
import { EliminarNodoDTO } from './dto';

export class EliminarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Elimina un nodo siempre que esté vacío
    async ejecutar(datos: EliminarNodoDTO): Promise<void> {
        try {
            const filas = await this.persistencia.ejecutar(
                `DELETE FROM nodos WHERE id_nodo = $1 RETURNING id_nodo`,
                [datos.id]
            );
            if (filas.length === 0) {
                throw new Error(`No existe un nodo con id ${datos.id}.`);
            }
        } catch (error: any) {
            if (error.code == "23001") {
                throw new Error('No se puede eliminar: la carpeta contiene elementos.');
            }
            throw error;
        }
    }
}