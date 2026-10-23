import { VerificarPassword } from './verificarPassword';
import { RegistrarRostro } from './registrarRostro';
import type { ActualizarRostroDto } from './dto';

// Cambia el rostro de un usuario ya registrado: primero exige la contraseña.
export class ActualizarRostro {
    private readonly registrarRostro = new RegistrarRostro();

    constructor(private readonly verificarPassword: VerificarPassword) {}

    async ejecutar(datos: ActualizarRostroDto): Promise<{ exito: boolean; mensaje: string }> {
        await this.verificarPassword.ejecutar({ id: datos.id, password: datos.password });
        return this.registrarRostro.ejecutar(datos.id, datos.embedding);
    }
}