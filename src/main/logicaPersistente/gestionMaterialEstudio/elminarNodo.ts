import { Persistencia } from '../../persistencia/Persistencia';
import { Nodo } from './entidades';
import { EliminarNodoDTO } from './dto';

export class EliminarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Elimina un nodo siempre que esté vacío
    async ejecutar(datos: EliminarNodoDTO): Promise<void> {
        try {
            await this.persistencia.ejecutar(
                `DELETE FROM nodos
                WHERE id_nodo  =  $1`,
                [datos.id]
            );
        } catch (error: any) {
            if (error.code == "23001") {
                throw new Error('No se puede eliminar: la carpeta contiene elementos.');
            }
            throw error;
        }
    }
}