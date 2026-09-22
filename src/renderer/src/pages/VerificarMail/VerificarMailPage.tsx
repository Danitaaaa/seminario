import { useState } from 'react';
import { colores } from '../../styles/colores';
import { espacios } from '../../styles/espacios';
import { globales } from '../../styles/globales';
import { tipografias } from '../../styles/tipografias';
import { useNavigate } from 'react-router-dom';

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
        <div>

            <h1>
                Verifica tu correo electrónico
            </h1>

            <p>
                Crear tu cuenta con:
                {email}
            </p>

            <input
                placeholder="Código"
                value={codigo}
                onChange={(e) =>
                    setCodigo(
                        e.target.value
                    )
                }
            />

            <button
                onClick={verificar}
            >
                Verificar
            </button>

        </div>
    );
}