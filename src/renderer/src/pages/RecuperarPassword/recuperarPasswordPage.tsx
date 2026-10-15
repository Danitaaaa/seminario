import { useState } from  'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/button';
import { Input } from '../../components/ui/Input/input';
import { Card } from '../../components/ui/Card/card';
import { Title } from '../../components/ui/Title/title';
import { CartelError } from '../../components/ui/commons/cartelesError';

export function RecuperarPasswordPage(){
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();
    
    const recuperarPassword = async () => {
        setError("");
        try {
            await window.api.recuperarPassword({email});
            localStorage.setItem('emailPendiente', email);
            navigate('/verificar-codigo');
        } catch (error) {
            setError(error instanceof Error ? error.message : "No se pudo recuperar la contraseña.");
        }
    }

    return (
        <main className="auth-layout auth-form-page">
            <div className="auth-form-card">
                <Card>
                    <div className="login-card">
                    <Title>
                        Recuperar contraseña
                    </Title>
                    <Input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="login-actions">
                        <Button onClick={recuperarPassword}>Recuperar contraseña</Button>
                        <Button variant="secondary" onClick={() => navigate("/")}>Cancelar</Button>
                    </div>
                    {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}
                    </div>
                </Card>
            </div>
        </main>
    );
}