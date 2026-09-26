import { BuscarNodos } from "./buscarNodos";
import { ElementoContenido } from "./entidades";
import { ListarContenidoDTO } from "./dto";

export class ListarContenido {
    constructor(
        private readonly buscarNodos: BuscarNodos,
        //private readonly buscarArchivos: BuscarArchivos,
    ) {}

    async ejecutar(criterios: ListarContenidoDTO): Promise<ElementoContenido[]> {
        // [nodos, archivos]
        const [nodos] = await Promise.all([
            //criterios.tipo === 'archivo' ? [] : this.buscarArchivos.ejecutar(criterios),
            criterios.tipo === 'carpeta' ? [] : this.buscarNodos.ejecutar(criterios),
        ]);

        const elementos: ElementoContenido[] = [
            ...nodos.map((n): ElementoContenido => ({
                id: n.id,
                nombre: n.nombre,
                tipo: 'carpeta',
                fechaDeCarga: n.fechaDeCarga,
                ultimaFechaAcceso: n.ultimaFechaAcceso,
                ultimaFechaModificacion: n.ultimaFechaModificacion,
                tamaño: n.tamaño.toString(),
            })),
          /*  ...archivos.map((a): ElementoContenido => ({
                id: a.id,
                nombre: a.nombre,
                tipo: 'archivo',
                fechaDeCarga: a.fechaDeCarga,
                ultimaFechaAcceso: a.ultimaFechaAcceso,
                ultimaFechaModificacion: a.ultimaFechaModificacion,
                tamaño: a.tamaño,
            })),*/
        ];
        console.log(this.ordenar(elementos, criterios));
        return this.ordenar(elementos, criterios);
    }

    private ordenar(elementos: ElementoContenido[], criterios: ListarContenidoDTO): ElementoContenido[] {
        const mapaCampo: Record<string, keyof ElementoContenido> = {
            nombre: 'nombre',
            fecha_carga: 'fechaDeCarga',
            fecha_ultimo_acceso: 'ultimaFechaAcceso',
            fecha_ultima_modificacion: 'ultimaFechaModificacion',
            tamaño: 'tamaño',
        };
        const clave = mapaCampo[criterios.ordenarPor ?? 'nombre'];
        const factor = criterios.direccion === 'DESC' ? -1 : 1;

        return [...elementos].sort((a, b) => {
            if (a[clave] < b[clave]) return -1 * factor;
            if (a[clave] > b[clave]) return 1 * factor;
            return 0;
        });
    }
}