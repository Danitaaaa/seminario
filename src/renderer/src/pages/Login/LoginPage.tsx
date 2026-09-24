import { useState } from  'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';
import { Title } from '../../components/ui/Title/Title';

export function LoginPage(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const iniciarSesion = () => {
        console.log(email);
        console.log(password);
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
                        <p>También podés iniciar sesión con tu rostro.</p>
                        <Button onClick={iniciarSesion}>Iniciar sesión</Button>
                        <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
                    </div>

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
                <p>Mirá a la cámara para escanear tu rostro.</p>
            </section>
        </main>
);
}
