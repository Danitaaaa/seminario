import { RegistrarRevision } from '../logicaPersistente/gestionDeRepeticionEspaciada/registrarRevision';
import { ListarFlashcardsPendientes } from '../logicaPersistente/gestionDeRepeticionEspaciada/listarFlashcardsPendientes';
import { ListarRepeticionesMaterial } from '../logicaPersistente/gestionDeRepeticionEspaciada/listarRepeticionesMaterial';
import { GuardarRepeticionMaterial } from '../logicaPersistente/gestionDeRepeticionEspaciada/guardarRepeticionMaterial';
import { GuardarRepeticionMaterialDTO, RegistrarRevisionDTO } from '../logicaPersistente/gestionDeRepeticionEspaciada/dto';

export class RepeticionEspaciada {
    constructor(
        private readonly listarFlashcardsPendientesCasoUso: ListarFlashcardsPendientes,
        private readonly registrarRevisionCasoUso: RegistrarRevision,
        private readonly listarMaterialCasoUso: ListarRepeticionesMaterial,
        private readonly guardarMaterialCasoUso: GuardarRepeticionMaterial
    ) {}

    async listarFlashcardsPendientes(usuarioId: number) {
        return this.listarFlashcardsPendientesCasoUso.ejecutar(usuarioId);
    }

    async registrarRevision(datos: RegistrarRevisionDTO) {
        return this.registrarRevisionCasoUso.ejecutar(datos);
    }

    async listarMaterial(usuarioId: number) {
        return this.listarMaterialCasoUso.ejecutar(usuarioId);
    }

    async guardarMaterial(datos: GuardarRepeticionMaterialDTO) {
        return this.guardarMaterialCasoUso.ejecutar(datos);
    }
}
