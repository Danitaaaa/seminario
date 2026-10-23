import { Usuario } from "../logicaPersistente/gestionDeUsuarios/usuario";
import { IniciarSesion } from "../logicaPersistente/gestionDeUsuarios/iniciarSesion";
import { RegistrarUsuario } from "../logicaPersistente/gestionDeUsuarios/registrarUsuario";
import { VerificarMail } from "../logicaPersistente/gestionDeUsuarios/verificarMail";
import { RecuperarPassword } from "../logicaPersistente/gestionDeUsuarios/recuperarPassword";
import { ValidarCodigo } from "../logicaPersistente/gestionDeUsuarios/validarCodigo";
import { CambiarPassword } from "../logicaPersistente/gestionDeUsuarios/cambiarPassword";
import { ObtenerPerfil } from "../logicaPersistente/gestionDeUsuarios/obtenerPerfil";
import { ModificarPerfil } from "../logicaPersistente/gestionDeUsuarios/modificarPerfil";
import { CambiarPasswordActual } from "../logicaPersistente/gestionDeUsuarios/cambiarPasswordActual";
import { EliminarUsuario } from "../logicaPersistente/gestionDeUsuarios/eliminarUsuario";
import { ActualizarFotoPerfil, ObtenerFotoPerfil } from "../logicaPersistente/gestionDeUsuarios/fotoPerfil";
import { VerificarPassword } from "../logicaPersistente/gestionDeUsuarios/verificarPassword";
import { ActualizarRostro } from "../logicaPersistente/gestionDeUsuarios/actualizarRostro";
import type { Perfil } from "../logicaPersistente/gestionDeUsuarios/perfil";
import type {
    CambiarPasswordDto, IniciarSesionDto, RegistrarUsuarioDto, ValidarCodigoDto,
    ObtenerPerfilDto, ModificarPerfilDto, CambiarPasswordActualDto, EliminarUsuarioDto,
    VerificarPasswordDto, ActualizarRostroDto,
} from "../logicaPersistente/gestionDeUsuarios/dto";

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
        private readonly eliminarUsuarioCaso: EliminarUsuario,
        private readonly obtenerFotoPerfilCaso: ObtenerFotoPerfil,
        private readonly actualizarFotoPerfilCaso: ActualizarFotoPerfil,
        private readonly verificarPasswordCaso: VerificarPassword,
        private readonly actualizarRostroCaso: ActualizarRostro
    ) {}

    async iniciarSesion(datos: IniciarSesionDto): Promise<Usuario> {
        return this.iniciarSesionCaso.ejecutar(datos);
    }

    async registrarUsuario(datos: RegistrarUsuarioDto) {
        return this.registrarUsuarioCaso.ejecutar(datos);
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

    async obtenerFotoPerfil(id: number): Promise<string | null> {
        return this.obtenerFotoPerfilCaso.ejecutar(id);
    }

    async actualizarFotoPerfil(id: number, rutaOrigen: string): Promise<string | null> {
        return this.actualizarFotoPerfilCaso.ejecutar(id, rutaOrigen);
    }

    async verificarPassword(datos: VerificarPasswordDto): Promise<void> {
        return this.verificarPasswordCaso.ejecutar(datos);
    }

    async actualizarRostro(datos: ActualizarRostroDto): Promise<{ exito: boolean; mensaje: string }> {
        return this.actualizarRostroCaso.ejecutar(datos);
    }
}