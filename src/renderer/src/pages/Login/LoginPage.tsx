import { useState } from  'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const iniciarSesion = () => {
        console.log(email);
        console.log(password);
    }

    return (
        <div>
            <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={iniciarSesion}>Iniciar sesión</button>

            <p>
                ¿No tienes cuenta?{" "}
                <span
                    onClick={() =>
                        navigate("/registro")
                    }
                    style={{
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    Registrarse
                </span>
            </p>

    </div>
);
}
