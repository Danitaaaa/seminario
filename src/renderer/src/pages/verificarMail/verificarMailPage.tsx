import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button/button';
import { Card } from '../../components/ui/card/card';
import { Input } from '../../components/ui/input/input';
import { Title } from '../../components/ui/title/title';
import { CartelError } from '../../components/comunes/cartelError';

export function VerificarMailPage() {

    const [codigo, setCodigo] =useState("");
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
            await window.api.verificarMail({email,codigo});

            alert("Correo verificado");

            navigate("/");

        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo verificar el correo.");
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