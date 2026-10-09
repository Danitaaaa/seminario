import { Usuario } from "../logicaPersistente/gestionDeUsuarios/usuario";
import { IniciarSesion } from "../logicaPersistente/gestionDeUsuarios/iniciarSesion";
import { RegistrarUsuario } from "../logicaPersistente/gestionDeUsuarios/registrarUsuario";
import { VerificarMail } from "../logicaPersistente/gestionDeUsuarios/verificarMail";
import { RecuperarPassword } from "../logicaPersistente/gestionDeUsuarios/recuperarPassword";
import { ValidarCodigo } from "../logicaPersistente/gestionDeUsuarios/validarCodigo";
import { CambiarPassword } from "../logicaPersistente/gestionDeUsuarios/cambiarPassword";
import type { CambiarPasswordDto, IniciarSesionDto, RegistrarUsuarioDto, ValidarCodigoDto } from "../logicaPersistente/gestionDeUsuarios/dto";

export class Usuarios {
    constructor(
        private readonly iniciarSesionCaso: IniciarSesion,
        private readonly registrarUsuarioCaso: RegistrarUsuario,
        private readonly verificarMailCaso: VerificarMail,
        private readonly recuperarPasswordCaso: RecuperarPassword,
        private readonly validarCodigoCaso: ValidarCodigo,
        private readonly cambiarPasswordCaso: CambiarPassword
    ) {}

    async iniciarSesion(
        datos: IniciarSesionDto
    ): Promise<Usuario> {
        return this.iniciarSesionCaso.ejecutar(
            datos
        );
    }

    async registrarUsuario(
        datos: RegistrarUsuarioDto
    ) {
        return this.registrarUsuarioCaso.ejecutar(
            datos
        );
    }

    async verificarMail(email: string, codigo: string): Promise<void> {
        return this.verificarMailCaso.ejecutar(email, codigo);
    }

    async recuperarPassword(email: string): Promise<void> {
        return this.recuperarPasswordCaso.ejecutar({ email });
    }

    async validarCodigo(datos: ValidarCodigoDto): Promise<void> {
        return this.validarCodigoCaso.ejecutar(datos);
    }

    async cambiarPassword(datos: CambiarPasswordDto): Promise<void> {
        return this.cambiarPasswordCaso.ejecutar(datos);
    }
}