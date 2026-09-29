import { BuscarNodos } from "./buscarNodos";
import { BuscarArchivos } from "./buscarArchivos";
import { ElementoContenido } from "./entidades";
import { ListarContenidoDTO, BuscadorArchivoDTO } from "./dto";

type Comparador = (a: ElementoContenido, b: ElementoContenido) => number;

export class ListarContenido {
    constructor(
        private readonly buscarNodos: BuscarNodos,
        private readonly buscarArchivos: BuscarArchivos,
    ) {}

    async ejecutar(criterios: ListarContenidoDTO): Promise<ElementoContenido[]> {
        const ordenarPor = criterios.ordenarPor ?? 'nombre';

        // 'tipo' no existe en las búsquedas internas: el orden final lo hace ordenar()
        const criteriosBusqueda: BuscadorArchivoDTO = {
            idPadre: criterios.idPadre,
            busqueda: criterios.busqueda,
            umbral: criterios.umbral,
            direccion: criterios.direccion,
            ordenarPor: ordenarPor === 'tipo' ? 'nombre' : ordenarPor,
        };

        const [nodos, archivos] = await Promise.all([
            criterios.tipo === 'archivo' ? [] : this.buscarNodos.ejecutar(criteriosBusqueda),
            criterios.tipo === 'carpeta' ? [] : this.buscarArchivos.ejecutar(criteriosBusqueda),
        ]);

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
            })),
        ];

        // Con búsqueda por nombre se respeta el orden por relevancia de la BD
        if (criterios.busqueda && ordenarPor === 'nombre') {
            return elementos;
        }

        return this.ordenar(elementos, ordenarPor, criterios.direccion);
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