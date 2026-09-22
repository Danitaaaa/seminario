import { Usuario } from "../logicaPersistente/gestionDeUsuarios/Usuario";
import { IniciarSesion } from "../logicaPersistente/gestionDeUsuarios/IniciarSesion";
import { IniciarSesionDto } from "../logicaPersistente/gestionDeUsuarios/IniciarSesion.dto";

export class Usuarios {
    constructor(
        private readonly iniciarSesionCaso: IniciarSesion
    ) {}

    async iniciarSesion(
        datos: IniciarSesionDto
    ): Promise<Usuario> {
        return this.iniciarSesionCaso.ejecutar(
            datos
        );
    }
}