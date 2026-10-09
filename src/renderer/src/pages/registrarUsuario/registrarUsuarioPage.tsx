import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';
import { Title } from '../../components/ui/Title/Title';
import { CartelError } from '../../components/ui/commons/CartelesError';
import RegistrarRostro from '../registrarRostro/registrarRostro';


export function RegistrarUsuarioPage() {
    const [ nombre, setNombre] = useState("");
    const [ apellido, setApellido ] = useState("");
    const [ apodo, setApodo ] = useState("");
    const [ email, setEmail] = useState("");
    const [ fechaNacimiento, setFechaNacimiento] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword , setConfirmPassword] = useState("");
    const [usuarioCreadoId, setUsuarioCreadoId] = useState<number | null>(null);
    const [iniciarRegistroFacial, setIniciarRegistroFacial] = useState(false);
    const [registrando, setRegistrando] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();
    let mensajeRegistroRostro = "Después de crear tu cuenta, vas a poder registrar tu rostro de forma opcional.";

    if (usuarioCreadoId !== null) {
        mensajeRegistroRostro = "Sumá el inicio de sesión con rostro de forma opcional o continuá con la verificación del correo.";
    }

    async function registrar(): Promise<void> {
        setError("");
        setRegistrando(true);
        try {
            const usuarioCreado = await window.api.registrarUsuario({
                nombre,
                apellido,
                apodo,
                email,
                fechaNacimiento:
                    new Date(fechaNacimiento),
                password,
                confirmPassword
            });

            localStorage.setItem("emailPendiente", email);
            setUsuarioCreadoId(usuarioCreado.id);

        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo registrar el usuario.");
        } finally {
            setRegistrando(false);
        }
    }

    return (
        <main className="auth-layout">
            <section className="auth-image" aria-label="Registro de rostro">
                {usuarioCreadoId !== null && iniciarRegistroFacial ? (
                    <div className="login-card">
                        <RegistrarRostro
                            usuarioId={usuarioCreadoId}
                            onRegistroExitoso={() => navigate('/verificar-mail')}
                        />
                        <Button
                            variant="secondary"
                            onClick={() => setIniciarRegistroFacial(false)}
                        >
                            Volver
                        </Button>
                    </div>
                ) : (
                    <div className="login-card">
                        <span aria-hidden="true">&#128100;</span>
                        <p className="registro-rostro-mensaje">{mensajeRegistroRostro}</p>
                        {usuarioCreadoId !== null && (
                            <Button onClick={() => setIniciarRegistroFacial(true)}>
                                Registrar rostro
                            </Button>
                        )}
                    </div>
                )}
            </section>

            <Card>
                {usuarioCreadoId !== null ? (
                    <div className="login-card">
                        <Title>Cuenta creada</Title>
                        <p>Ahora podés registrar tu rostro o continuar con la verificación por correo.</p>
                        <Button variant="secondary" onClick={() => navigate('/verificar-mail')}>
                            Continuar sin registrar el rostro
                        </Button>
                    </div>
                ) : (
                    <>
                <Title>Registrarse</Title>

                <div className="registro-row">
                    <Input
                        placeholder="Nombre"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                    />
                    <Input
                        placeholder="Apellido"
                        value={apellido}
                        onChange={e => setApellido(e.target.value)}
                    />
                </div>

                <Input
                    placeholder="Apodo"
                    value={apodo}
                    onChange={e => setApodo(e.target.value)}
                />

                <Input
                    placeholder="Correo"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <Input
                    type="date"
                    placeholder="Fecha de nacimiento"
                    value={fechaNacimiento}
                    onChange={e => setFechaNacimiento(e.target.value)}
                />

                <div className="registro-row">
                    <Input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Confirmar contraseña"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div className="login-actions registro-actions">
                    <Button onClick={() => void registrar()} disabled={registrando}>Registrarse</Button>
                    <Button variant="secondary" onClick={() => navigate("/")}>Cancelar</Button>
                </div>
                {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}
                    </>
                )}
            </Card>
        </main>
    );
}
