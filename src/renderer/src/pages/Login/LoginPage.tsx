import { useState } from  'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';
import { Title } from '../../components/ui/Title/Title';
import LoginFacial from './LoginFacialPage';

export function LoginPage(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [modoFacial, setModoFacial] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const finalizarInicioSesion = (usuarioId: string) => {
        localStorage.setItem("usuarioId", usuarioId);
        navigate("/dashboard");
    };

    const iniciarSesion = async () => {
        setError("");
        try {
            const usuario = await window.api.iniciarSesion({ email, password });
            finalizarInicioSesion(usuario.id);
        } catch {
            setError("No se pudo iniciar sesión. Revisá tus datos e intentá nuevamente.");
        }
    }

    const cancelar = () => {
        setEmail("");
        setPassword("");
    }

    return (
        <main className="auth-layout">
            <Card>
                <div className="login-card">

                    <Title>
                        Iniciar sesión
                    </Title>

                    <Input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <p
                        className="forgot-password"
                        onClick={() => navigate("/recuperar-contraseña")}
                    >
                        ¿Olvidaste tu contraseña?
                    </p>
                    
                    <div className="login-actions">
                        <Button onClick={iniciarSesion}>Iniciar sesión</Button>
                        <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
                    </div>
                    {error && <p role="alert">{error}</p>}

                    <p>
                        ¿No tenés una cuenta? Haga click en{" "}
                        <span
                            className="link-register"
                            onClick={() =>
                                navigate("/registro")
                            }
                        >
                            Registrarse
                        </span>
                    </p>
                </div>
            </Card>

            <section className="login-facial" aria-label="Login facial">
                <Title>Reconocimiento facial</Title>
                {modoFacial ? (
                    <>
                        <p>Mirá a la cámara para escanear tu rostro.</p>
                        <LoginFacial onLoginExitoso={finalizarInicioSesion} />
                        <Button variant="secondary" onClick={() => setModoFacial(false)}>
                            Usar contraseña
                        </Button>
                    </>
                ) : (
                    <>
                        <p>Mirá a la cámara para escanear tu rostro.</p>
                        <Button variant="secondary" onClick={() => setModoFacial(true)}>
                            Iniciar sesión con rostro
                        </Button>
                    </>
                )}
            </section>
        </main>
);
}
