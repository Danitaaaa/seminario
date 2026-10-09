import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { Input } from "../../components/ui/Input/Input";
import { Card } from "../../components/ui/Card/Card";
import { Title } from "../../components/ui/Title/Title";
import { CartelError } from "../../components/ui/commons/CartelesError";

export function CambiarPasswordPage() {
    const [nuevaPassword, setNuevaPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const email = localStorage.getItem("emailPendiente");

    async function cambiarPassword() {
        setError("");
        if (!email) {
            setError("No se encontró el email para cambiar la contraseña.");
            return;
        }

        try {
            await window.api.cambiarPassword({ email, nuevaPassword });
            localStorage.removeItem("emailPendiente");
            alert("Contraseña cambiada exitosamente");

            navigate("/");

        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo cambiar la contraseña.");
        }
    }

    return (
        <main className="auth-layout auth-form-page">
            <div className="auth-form-card">
                <Card>
                    <div className="login-card">
                        <Title>Cambiar contraseña</Title>
                        <Input
                            type="password"
                            placeholder="Nueva contraseña"
                            value={nuevaPassword}
                            onChange={e => setNuevaPassword(e.target.value)}
                        />
                        {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}
                        <Button onClick={cambiarPassword}>Cambiar contraseña</Button>
                    </div>
                </Card>
            </div>
        </main>
    );
}