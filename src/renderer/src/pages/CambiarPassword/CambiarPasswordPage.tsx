import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { Input } from "../../components/ui/Input/Input";
import { Card } from "../../components/ui/Card/Card";
import { Title } from "../../components/ui/Title/Title";

export function CambiarPasswordPage() {
    const [nuevaPassword, setNuevaPassword] = useState("");
    const navigate = useNavigate();
    const email = localStorage.getItem("emailPendiente");

    async function cambiarPassword() {
        if (!email) {
            return;
        }

        try {
            await window.api.cambiarPassword({ email, nuevaPassword });
            localStorage.removeItem("emailPendiente");
            alert("Contraseña cambiada exitosamente");

            navigate("/");

        } catch (error) {
            console.error("Error al cambiar la contraseña:", error);
        }
    }

    return (
        <Card>
            <Title>Cambiar contraseña</Title>
            <Input
                type="password"
                placeholder="Nueva contraseña"
                value={nuevaPassword}
                onChange={e => setNuevaPassword(e.target.value)}
            />
            <Button onClick={cambiarPassword}>Cambiar contraseña</Button>
        </Card>
    );
}