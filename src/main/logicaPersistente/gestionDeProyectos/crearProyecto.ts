import { CrearProyectoDTOSchema, CrearProyectoDTO } from './dto';
import { Proyecto } from './entidades';
import { IPersistenciaProyectos } from './interfacesSincronizacion';
import { materializarProyecto } from './materializador';
import { registrarCambio } from './permisos';

const ID_NODO_RAIZ_GLOBAL = 1;

interface ICrearNodo { ejecutar(dto: { nombre: string; idPadre: number | null }): Promise<{ id: number }>; }

export class CrearProyecto {
    constructor(private persistencia: IPersistenciaProyectos, private crearNodo: ICrearNodo) {}

    async ejecutar(entrada: CrearProyectoDTO): Promise<Proyecto> {
        const dto = CrearProyectoDTOSchema.parse(entrada);

        // 1. Carpeta raíz propia del proyecto (cuelga de la raíz global, id 1)
        const nodoRaiz = await this.crearNodo.ejecutar({ nombre: dto.nombre, idPadre: ID_NODO_RAIZ_GLOBAL });

        // 2. Proyecto + propietario + cola de sincronización
        return this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `INSERT INTO proyectos (nombre, numero_proyecto, materia_asociada, fecha_fin, id_nodo_raiz)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [dto.nombre, dto.numeroProyecto, dto.materiaAsociada ?? null, dto.fechaFin ?? null, nodoRaiz.id],
            );
            const proyecto = materializarProyecto(filas[0]);

            await tx.ejecutar(
                `INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol) VALUES ($1, $2, 'propietario')`,
                [proyecto.id, dto.idUsuario],
            );
            await registrarCambio(tx, proyecto.id, 'proyecto', proyecto.id, 'crear', { nombre: proyecto.nombre });
            return proyecto;
        });
    }
}