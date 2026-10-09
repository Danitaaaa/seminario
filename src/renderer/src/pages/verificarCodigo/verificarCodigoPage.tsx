import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Title } from '../../components/ui/Title/Title';
import { CartelError } from '../../components/ui/commons/CartelesError';

export function VerificarCodigoPage() {
    const [codigo, setCodigo] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const email = localStorage.getItem("emailPendiente");

    async function verificar() {
        setError("");
        if (!email) {
            setError("No se encontró el email para verificar el código.");
            return;
        }

        try {
            await window.api.validarCodigo({ email, codigo });
            navigate("/cambioPassword");
        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo verificar el código.");
        }
    }

    return (
        <main className="auth-layout auth-form-page">
            <div className="auth-form-card">
                <Card>
                    <div className="login-card">
                        <Title>Verifica tu correo electrónico</Title>
                        <p>
                            Creaste tu cuenta con: {email}
                        </p>
                        <Input
                            placeholder="Código"
                            value={codigo}
                            onChange={e => setCodigo(e.target.value)}
                        />
                        {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}
                        <Button onClick={verificar}>Verificar</Button>
                    </div>
                </Card>
            </div>
        </main>
    );
}