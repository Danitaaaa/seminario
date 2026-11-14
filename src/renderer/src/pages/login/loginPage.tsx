import { useEffect, useState } from  'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button/button';
import { Input } from '../../components/ui/input/input';
import { Card } from '../../components/ui/card/card';
import { Title } from '../../components/ui/title/title';
import { CartelError } from '../../components/comunes/cartelError';
import LoginFacial from './loginFacialPage';
import { guardarSesion } from '../../../lib/sesion';
import { enterParaAvanzar } from '../../utils/enterParaAvanzar';
import { useVoice } from '../../hooks/useVoice';
import { GuidedFaceLogin } from './GuidedFaceLogin';

export function LoginPage(){
    const { modoVoz } = useVoice();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [modoFacial, setModoFacial] = useState(false);
    const [modoGuiado, setModoGuiado] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        if (modoVoz === true) {
            setModoFacial(false);
        } else {
            setModoGuiado(false);
        }
    }, [modoVoz]);

    const finalizarInicioSesion = (usuarioId: number) => {
        guardarSesion(usuarioId);
        navigate("/dashboard", { replace: true });
    };

    const iniciarSesion = async () => {
        setError("");
        try {
            const usuario = await window.api.iniciarSesion({ email, password });
            finalizarInicioSesion(usuario.id);
        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
        }
    }

    const cancelar = () => {
        setEmail("");
        setPassword("");
    }

    return (
        <main className="auth-layout">
            <Card>
                <div className="login-card" onKeyDown={enterParaAvanzar(iniciarSesion)}>

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
                    {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}

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
                {modoVoz === true ? (
                    modoGuiado ? (
                            <GuidedFaceLogin
                                onLoginExitoso={finalizarInicioSesion}
                                onElegirContraseña={() => setModoGuiado(false)}
                            />
                    ) : (
                            <>
                                <p>Presioná Enter sobre la opción para iniciar el reconocimiento facial.</p>
                                <div className="voz-login-opciones">
                                    <Button autoFocus onClick={() => setModoGuiado(true)}>
                                        Iniciar sesión con rostro
                                    </Button>
                                </div>
                            </>
                    )
                ) : modoFacial ? (
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