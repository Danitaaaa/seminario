import { useState } from  'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Card } from '../../components/ui/Card/Card';
import { Title } from '../../components/ui/Title/Title';

export function RecuperarPasswordPage(){
    const [email, setEmail] = useState("");

    const navigate = useNavigate();
    
    const recuperarPassword = async () => {
        try {
            await window.api.recuperarPassword({email});
            localStorage.setItem('emailPendiente', email);
            navigate('/verificar-codigo');
        } catch (error) {
            console.error('Error al recuperar contraseña:', error);
        }
    }

    return (
        <main className="auth-layout">
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
                    </div>
                </div>
            </Card>
        </main>
    );
}