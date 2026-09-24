import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Title } from '../../components/ui/Title/Title';

export function VerificarMailPage() {

    const [codigo, setCodigo] =useState("");

    const navigate = useNavigate();

    const email = localStorage.getItem("emailPendiente");

    async function verificar() {

        if (!email) {
            return;
        }

        try {
            await window.api.verificarMail({email,codigo});

            alert("Correo verificado");

            navigate("/");

        } catch {
            alert("Código incorrecto");
        }
    }

    return (
        <main className="auth-layout">
            <section className="auth-image" aria-label="Imagen de perfil">
                <span aria-hidden="true">&#128100;</span>
            </section>

            <Card>
                <Title>Verifica tu correo electrónico</Title>

                <p>
                    Creaste tu cuenta con: {email}
                </p>

                <Input
                    placeholder="Código"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                />

                <Button onClick={verificar}>Verificar</Button>
            </Card>
        </main>
    );
}