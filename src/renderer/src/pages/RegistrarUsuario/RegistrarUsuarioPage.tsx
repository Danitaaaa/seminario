import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';
import { Title } from '../../components/ui/Title/Title';


export function RegistrarUsuarioPage() {
    const [ nombre, setNombre] = useState("");
    const [ apellido, setApellido ] = useState("");
    const [ apodo, setApodo ] = useState("");
    const [ email, setEmail] = useState("");
    const [ fechaNacimiento, setFechaNacimiento] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword , setConfirmPassword] = useState("");

    const navigate = useNavigate();

    async function registrar() {
        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");

            return;
        }

        try {
            await window.api.registrarUsuario({
                nombre,
                apellido,
                apodo,
                email,
                fechaNacimiento:
                    new Date(fechaNacimiento),
                password
            });

            localStorage.setItem(
                "emailPendiente",
                email
            );

            navigate(
                "/verificar-mail"
            );

        } catch {
            alert(
                "Error al registrar usuario"
            );
        }
    }

    return (
        <main className="auth-layout">
            <section className="auth-image" aria-label="Imagen de perfil">
                <span aria-hidden="true">&#128100;</span>
            </section>

            <Card>
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
                    <Button onClick={registrar}>Registrarse</Button>
                    <Button variant="secondary" onClick={() => navigate("/")}>Cancelar</Button>
                </div>
            </Card>
        </main>
    );
}
