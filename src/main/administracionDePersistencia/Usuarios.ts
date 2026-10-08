import { Usuario } from "../logicaPersistente/gestionDeUsuarios/Usuario";
import { IniciarSesion } from "../logicaPersistente/gestionDeUsuarios/IniciarSesion";
import { RegistrarUsuario } from "../logicaPersistente/gestionDeUsuarios/RegistrarUsuario";
import { VerificarMail } from "../logicaPersistente/gestionDeUsuarios/VerificarMail";
import { RecuperarPassword } from "../logicaPersistente/gestionDeUsuarios/RecuperarPassword";
import { ValidarCodigo } from "../logicaPersistente/gestionDeUsuarios/ValidarCodigo";
import { CambiarPassword } from "../logicaPersistente/gestionDeUsuarios/CambiarPassword";
import type { CambiarPasswordDto, IniciarSesionDto, RegistrarUsuarioDto, ValidarCodigoDto } from "../logicaPersistente/gestionDeUsuarios/dto";
import { ObtenerPerfil } from "../logicaPersistente/gestionDeUsuarios/ObtenerPerfil";
import { ModificarPerfil } from "../logicaPersistente/gestionDeUsuarios/ModificarPerfil";
import { CambiarPasswordActual } from "../logicaPersistente/gestionDeUsuarios/CambiarPasswordActual";
import { EliminarUsuario } from "../logicaPersistente/gestionDeUsuarios/EliminarUsuario";
import type { Perfil } from "../logicaPersistente/gestionDeUsuarios/Perfil";
import type { ObtenerPerfilDto, ModificarPerfilDto, CambiarPasswordActualDto, EliminarUsuarioDto } from "../logicaPersistente/gestionDeUsuarios/dto";


export class Usuarios {
    constructor(
        private readonly iniciarSesionCaso: IniciarSesion,
        private readonly registrarUsuarioCaso: RegistrarUsuario,
        private readonly verificarMailCaso: VerificarMail,
        private readonly recuperarPasswordCaso: RecuperarPassword,
        private readonly validarCodigoCaso: ValidarCodigo,
        private readonly cambiarPasswordCaso: CambiarPassword,
        private readonly obtenerPerfilCaso: ObtenerPerfil,
        private readonly modificarPerfilCaso: ModificarPerfil,
        private readonly cambiarPasswordActualCaso: CambiarPasswordActual,
        private readonly eliminarUsuarioCaso: EliminarUsuario
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

        async obtenerPerfil(datos: ObtenerPerfilDto): Promise<Perfil> {
        return this.obtenerPerfilCaso.ejecutar(datos);
    }

    async modificarPerfil(datos: ModificarPerfilDto): Promise<Perfil> {
        return this.modificarPerfilCaso.ejecutar(datos);
    }

    async cambiarPasswordActual(datos: CambiarPasswordActualDto): Promise<void> {
        return this.cambiarPasswordActualCaso.ejecutar(datos);
    }

    async eliminarUsuario(datos: EliminarUsuarioDto): Promise<void> {
        return this.eliminarUsuarioCaso.ejecutar(datos);
    }
}