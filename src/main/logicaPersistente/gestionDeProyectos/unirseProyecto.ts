import { UnirseAProyectoDTOSchema, UnirseAProyectoDTO } from './dto';
import { Proyecto } from './entidades';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { materializarProyecto } from './materializador';
import { ErrorSincronizacion } from './erroresSincronizacion';
import type { SincronizarProyecto } from './sincronizarProyecto';

interface ICrearNodo { ejecutar(dto: { nombre: string; idPadre: number | null }): Promise<{ id: number }>; }

/** Unirse con el enlace de invitación (el propietario tiene que haberte agregado antes por mail). */
export class UnirseAProyecto {
    constructor(
        private persistencia: IPersistenciaProyectos,
        private sincronizador: ISincronizador,
        private crearNodo: ICrearNodo,
        private sincronizar: Pick<SincronizarProyecto, 'ejecutar'>,
        private idNodoPadreProyectos: number,
    ) {}

    async ejecutar(entrada: UnirseAProyectoDTO): Promise<Proyecto> {
        const dto = UnirseAProyectoDTOSchema.parse(entrada);
        if (!this.sincronizador.estaConectado()) await this.sincronizador.conectar();

        const info = await this.sincronizador.resolverEnlace(dto.enlace);
        if (!info.rol) throw new ErrorSincronizacion('NO_INVITADO', 'No figurás como miembro de este proyecto.');

        const existente = await this.persistencia.ejecutar(`SELECT * FROM proyectos WHERE id_remoto = $1`, [info.idRemoto]);
        if (existente[0]) return materializarProyecto(existente[0]); // ya estaba unido en esta PC

        const nodoRaiz = await this.crearNodo.ejecutar({ nombre: info.nombre, idPadre: this.idNodoPadreProyectos });
        const proyecto = await this.persistencia.transaccion(async tx => {
            const filas = await tx.ejecutar(
                `INSERT INTO proyectos (nombre, id_nodo_raiz, id_remoto, enlace) VALUES ($1, $2, $3, $4) RETURNING *`,
                [info.nombre, nodoRaiz.id, info.idRemoto, dto.enlace]);
            const p = materializarProyecto(filas[0]);
            // Unirse NO es un cambio para compartir: no se registra en la cola.
            await tx.ejecutar(
                `INSERT INTO proyecto_miembros (id_proyecto, id_usuario, rol) VALUES ($1, $2, $3)`,
                [p.idProyecto, dto.idUsuario, info.rol]);
            return p;
        });

        // Carga inicial desde la versión 0. Si falla (sin red), el proyecto queda creado y se reintenta sincronizando.
        await this.sincronizar.ejecutar({ idProyecto: proyecto.idProyecto, idUsuario: dto.idUsuario }).catch(e => {
            console.warn('Carga inicial pendiente; se reintentará al sincronizar.', e);
        });
        return proyecto;
    }
}