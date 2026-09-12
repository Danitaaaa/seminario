import { useEffect, useState } from 'react';
import { Saludo } from '../../types/prueba';

// Pantalla de prueba: si esto muestra el mensaje de la tabla "saludos",
// significa que las 6 capas están conectadas de punta a punta:
// Postgres -> Persistencia -> ObtenerSaludo -> Prueba (facade) -> IPC -> preload -> React.
export function PruebaPage() {
  const [saludo, setSaludo] = useState<Saludo | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    window.api
      .obtenerSaludo()
      .then((resultado) => {
        setSaludo(resultado);
        setEstado('ok');
      })
      .catch((err) => {
        console.error(err);
        setEstado('error');
      });
  }, []);

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, marginTop: 16 }}>
      <h2>Prueba de conexión</h2>
      {estado === 'cargando' && <p>Cargando...</p>}
      {estado === 'error' && <p style={{ color: 'red' }}>Error al conectar con la base de datos.</p>}
      {estado === 'ok' && saludo && (
        <p>
          ✅ <strong>{saludo.mensaje}</strong> (id {saludo.id}, guardado en{' '}
          {new Date(saludo.creadoEn).toLocaleString()})
        </p>
      )}
      {estado === 'ok' && !saludo && <p>No hay filas en la tabla "saludos".</p>}
    </div>
  );
}
