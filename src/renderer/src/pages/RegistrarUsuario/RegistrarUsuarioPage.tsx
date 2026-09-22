import { useState } from 'react';
import { colores } from '../../styles/colores';
import { espacios } from '../../styles/espacios';
import { globales } from '../../styles/globales';
import { tipografias } from '../../styles/tipografias';
import { useNavigate } from 'react-router-dom';

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
        <div>
            <h1>Registrarse</h1>

            <input
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            />

            <input
            placeholder="Apellido"
            value={apellido}
            onChange={e => setApellido(e.target.value)}
            />

            <input
            placeholder="Apodo"
            value={apodo}
            onChange={e => setApodo(e.target.value)}
            />

            <input
            placeholder="Correo"
            value={email}
            onChange={e => setEmail(e.target.value)}
            />

            <input
            type="date"
            placeholder="Fecha de nacimiento"
            value={fechaNacimiento}
            onChange={e => setFechaNacimiento(e.target.value)}
            />

            <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            />

            <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            />

            <button onClick={registrar}>Registrarse</button>
            
        </div>
    );
}
