import { Usuario } from "../logicaPersistente/gestionDeUsuarios/Usuario";
import { IniciarSesion } from "../logicaPersistente/gestionDeUsuarios/IniciarSesion";
import { IniciarSesionDto } from "../logicaPersistente/gestionDeUsuarios/dto/IniciarSesion.dto";
import { RegistrarUsuario } from "../logicaPersistente/gestionDeUsuarios/RegistrarUsuario";
import { RegistrarUsuarioDto } from "../logicaPersistente/gestionDeUsuarios/dto/RegistrarUsuario.dto";
import { VerificarMail } from "../logicaPersistente/gestionDeUsuarios/VerificarMail";
import { RecuperarPassword } from "../logicaPersistente/gestionDeUsuarios/RecuperarPassword";
import { VerificarMailDto } from "../logicaPersistente/gestionDeUsuarios/dto/VerificarMail.dto";
import { CambiarPasswordDto } from "../logicaPersistente/gestionDeUsuarios/dto/CambiarPassword.dto";
import { ValidarCodigoDto } from "../logicaPersistente/gestionDeUsuarios/dto/ValidarCodigo.dto";
import { ValidarCodigo } from "../logicaPersistente/gestionDeUsuarios/ValidarCodigo";
import { CambiarPassword } from "../logicaPersistente/gestionDeUsuarios/CambiarPassword";

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