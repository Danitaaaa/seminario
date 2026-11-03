import { Persistencia } from '../../persistencia/persistencia';
import { EliminarNodoDTO } from './dto';
import { registrarCambioContenido } from '../gestionDeProyectos/alcanceContenido';
import { exigirPermisoNodo } from './alcanceContenido';

// Elimina un nodo siempre que esté vacío
export class EliminarNodo {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: EliminarNodoDTO): Promise<void> {
        await exigirPermisoNodo(this.persistencia, datos.id, 'carpeta.eliminar');

        let eliminado: { id_nodo: number; id_global: string; id_padre: number | null };
        try {
            const filas = await this.persistencia.ejecutar(
                `DELETE FROM nodos WHERE id_nodo = $1 RETURNING id_nodo, id_global, id_padre`,
                [datos.id]
            );
            if (filas.length === 0) {
                throw new Error(`No existe un nodo con id ${datos.id}.`);
            }
            eliminado = filas[0];
        } catch (error: any) {
            // 23503 = foreign_key_violation (el código anterior tenía un espacio: "23503 ")
            if (error.code === '23001' || error.code === '23503') {
                throw new Error('No se puede eliminar: la carpeta contiene elementos.');
            }
            throw error;
        }
        if (eliminado.id_padre !== null) {
            await registrarCambioContenido(this.persistencia, 'nodo', eliminado.id_nodo, 'eliminar',
                eliminado.id_global, eliminado.id_padre);
        }
    }
}