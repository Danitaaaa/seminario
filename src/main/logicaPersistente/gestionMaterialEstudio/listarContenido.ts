import { Persistencia } from '../../persistencia/persistencia';
import { BuscarNodos } from "./buscarNodos";
import { BuscarArchivos } from "./buscarArchivos";
import { BuscarNodosPorMateria } from "./buscarNodosPorMateria";
import { ElementoContenido } from "./entidades";
import { ListarContenidoDTO, BuscadorArchivoDTO } from "./dto";
import { exigirPermisoNodo } from './alcanceContenido';

type Comparador = (a: ElementoContenido, b: ElementoContenido) => number;

// Lista nodos y archivos y los ordena y filtra por los criterios pasados
export class ListarContenido {
    constructor(
        private readonly buscarNodos: BuscarNodos,
        private readonly buscarArchivos: BuscarArchivos,
        private readonly persistencia: Persistencia, // nuevo: actualizá donde se instancia
        private readonly buscarPorMateria: BuscarNodosPorMateria,
    ) {}

    async ejecutar(criterios: ListarContenidoDTO): Promise<ElementoContenido[]> {
        await exigirPermisoNodo(this.persistencia, criterios.idPadre, 'archivo.ver');

        const ordenarPor = criterios.ordenarPor ?? 'nombre';

        // 'tipo' no existe en las búsquedas internas: el orden final lo hace ordenar()
        const criteriosBusqueda: BuscadorArchivoDTO = {
            idPadre: criterios.idPadre,
            busqueda: criterios.busqueda,
            umbral: criterios.umbral,
            direccion: criterios.direccion,
            ordenarPor: ordenarPor === 'tipo' ? 'nombre' : ordenarPor,
        };

        // Filtro por materia: solo carpetas de esa materia, en cualquier nivel debajo de idPadre.
        const [nodos, archivos] = criterios.idMateria
            ? [await this.buscarPorMateria.ejecutar(criterios.idPadre, criterios.idMateria), []]
            : await Promise.all([
                criterios.tipo === 'archivo' ? [] : this.buscarNodos.ejecutar(criteriosBusqueda),
                criterios.tipo === 'carpeta' ? [] : this.buscarArchivos.ejecutar(criteriosBusqueda),
            ]);
        const nombresMaterias = await this.nombresDeMaterias(nodos.map((n) => n.idMateria));

        const elementos: ElementoContenido[] = [
            ...nodos.map((n): ElementoContenido => ({
                id: n.id,
                nombre: n.nombre,
                tipo: 'carpeta',
                extension: '',
                fechaDeCarga: n.fechaDeCarga,
                ultimaFechaAcceso: n.ultimaFechaAcceso,
                ultimaFechaModificacion: n.ultimaFechaModificacion,
                tamaño: n.tamaño.toString(),
                idMateria: n.idMateria,
                materia: n.idMateria ? nombresMaterias.get(n.idMateria) ?? null : null,
            })),
            ...archivos.map((a): ElementoContenido => ({
                id: a.id,
                nombre: a.nombre,
                tipo: 'archivo',
                extension: a.extension,
                fechaDeCarga: a.fechaDeCarga,
                ultimaFechaAcceso: a.ultimaFechaAcceso,
                ultimaFechaModificacion: a.ultimaFechaModificacion,
                tamaño: a.tamanio.toString(),
                idMateria: null,
                materia: null,
            })),
        ];

        // Con búsqueda por nombre se respeta el orden por relevancia de la BD
        if (criterios.busqueda && ordenarPor === 'nombre') {
            return elementos;
        }

        return this.ordenar(elementos, ordenarPor, criterios.direccion);
    }

    // Trae en una sola consulta los nombres de las materias de las carpetas listadas.
    private async nombresDeMaterias(ids: (number | null)[]): Promise<Map<number, string>> {
        const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
        if (unicos.length === 0) return new Map();
        const filas = await this.persistencia.ejecutar(
            `SELECT id_materia, nombre FROM materia WHERE id_materia = ANY($1::int[])`,
            [unicos]
        );
        return new Map(filas.map((f: any) => [f.id_materia, f.nombre]));
    }

    private ordenar(
        elementos: ElementoContenido[],
        ordenarPor: ListarContenidoDTO['ordenarPor'],
        direccion: ListarContenidoDTO['direccion'],
    ): ElementoContenido[] {
        const porNombre: Comparador = (a, b) =>
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });

        const comparadores: Record<string, Comparador> = {
            nombre: porNombre,
            fecha_carga: (a, b) => +a.fechaDeCarga - +b.fechaDeCarga,
            fecha_ultimo_acceso: (a, b) => +a.ultimaFechaAcceso - +b.ultimaFechaAcceso,
            fecha_ultima_modificacion: (a, b) => +a.ultimaFechaModificacion - +b.ultimaFechaModificacion,
            tamaño: (a, b) => Number(a.tamaño) - Number(b.tamaño),
            tipo: (a, b) => {
                if (a.tipo !== b.tipo) return a.tipo === 'carpeta' ? -1 : 1;
                return a.extension.localeCompare(b.extension) || porNombre(a, b);
            },
        };

        const comparar = comparadores[ordenarPor ?? 'nombre'] ?? porNombre;
        const factor = direccion === 'DESC' ? -1 : 1;

        return [...elementos].sort((a, b) => comparar(a, b) * factor);
    }
}