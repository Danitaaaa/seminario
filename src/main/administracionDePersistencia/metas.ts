import { CrearMeta } from '../logicaPersistente/gestionDeMetas/crearMeta';
import { ListarMetas } from '../logicaPersistente/gestionDeMetas/listarMetas';
import { ModificarMeta } from '../logicaPersistente/gestionDeMetas/modificarMeta';
import { AlternarMeta } from '../logicaPersistente/gestionDeMetas/alternarMeta';
import { EliminarMeta } from '../logicaPersistente/gestionDeMetas/eliminarMeta';
import { CopiarMetas } from '../logicaPersistente/gestionDeMetas/copiarMetas';
import { EstadisticasMetasProyecto } from '../logicaPersistente/gestionDeMetas/estadisticasMetas';
import type {
    CrearMetaDTO, ListarMetasDTO, ModificarMetaDTO, AlternarMetaDTO,
    EliminarMetaDTO, CopiarMetasDTO, EstadisticasMetasDTO,
} from '../logicaPersistente/gestionDeMetas/dto';

export class Metas {
    constructor(
        private readonly crearMeta: CrearMeta,
        private readonly listarMetas: ListarMetas,
        private readonly modificarMeta: ModificarMeta,
        private readonly alternarMeta: AlternarMeta,
        private readonly eliminarMeta: EliminarMeta,
        private readonly copiarMetas: CopiarMetas,
        private readonly estadisticasMetas: EstadisticasMetasProyecto,
    ) {}

    crear(datos: CrearMetaDTO) { return this.crearMeta.ejecutar(datos); }
    listar(datos: ListarMetasDTO) { return this.listarMetas.ejecutar(datos); }
    modificar(datos: ModificarMetaDTO) { return this.modificarMeta.ejecutar(datos); }
    alternar(datos: AlternarMetaDTO) { return this.alternarMeta.ejecutar(datos); }
    eliminar(datos: EliminarMetaDTO) { return this.eliminarMeta.ejecutar(datos); }
    copiar(datos: CopiarMetasDTO) { return this.copiarMetas.ejecutar(datos); }
    estadisticas(datos: EstadisticasMetasDTO) { return this.estadisticasMetas.ejecutar(datos); }
}