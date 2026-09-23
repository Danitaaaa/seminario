import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';


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
        <Card>
            <h1>Registrarse</h1>

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

            <Button onClick={registrar}>Registrarse</Button>
        </Card>
    );
}
