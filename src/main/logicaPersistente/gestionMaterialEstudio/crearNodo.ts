import { Persistencia } from '../../persistencia/persistencia';
import { Nodo } from './entidades';
import { materializarNodo } from './materializador';
import { CrearNodoDTO } from './dto';
import { registrarCambioContenido } from '../gestionDeProyectos/alcanceContenido';
import { exigirPermisoNodo } from './alcanceContenido';

export class CrearNodo {
    constructor(private readonly persistencia: Persistencia) {}

    // Crea un nuevo nodo con el nombre definido por el usuario
    async ejecutar(datos: CrearNodoDTO): Promise<Nodo> {
        if (!datos.nombre.trim()) {
            throw new Error('El nombre de la carpeta no puede estar vacío.');
        }

        // La raíz de un proyecto nuevo cuelga del nodo global (sin proyecto): ahí no hay chequeo.
        await exigirPermisoNodo(this.persistencia, datos.idPadre, 'carpeta.crear');

        let fila: any;
        try {
            const filas = await this.persistencia.ejecutar(
                `INSERT INTO nodos (nombre, fecha_carga, ultima_fecha_acceso,
                                    ultima_fecha_modificacion, tamaño, id_padre)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [datos.nombre, new Date(), new Date(), new Date(), 0, datos.idPadre]
            );
            fila = filas[0];
        } catch (error: any) {
            if (error.code === '23505') {
                throw new Error(`Ya existe una carpeta llamada "${datos.nombre}" en esta ubicación.`);
            }
            throw error;
        }
        // Encola solo si cuelga de un proyecto (la raíz de un proyecto nuevo cuelga del nodo global: no se encola).
        if (fila.id_padre !== null) {
            await registrarCambioContenido(this.persistencia, 'nodo', fila.id_nodo, 'crear',
                fila.id_global, fila.id_padre, { nombre: fila.nombre });
        }
        return materializarNodo(fila);
    }
}