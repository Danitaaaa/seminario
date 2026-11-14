import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app';
import './styles/globals.css';
import './styles/layout.css';
import './styles/tonos.css';
import { aplicarPreferencia } from './hooks/usarModo';
import { cargarReglas } from './permisos';
import { VoiceProvider } from './hooks/useVoice';
import { configurarLector } from './voz/narrador';

aplicarPreferencia();

// NVDA a veces se detecta recién después de abrir la ventana (durante el splash):
// se escucha el cambio desde el arranque para no perder ese aviso.
window.api.alCambiarLector(configurarLector);

// Antes de mostrar la app: cargar permisos y saber si hay lector de pantalla,
// así la primera frase ya sale por el lado correcto.
Promise.all([
  cargarReglas().catch((e) => console.error('No se pudieron cargar los permisos', e)),
  window.api.lectorPantallaActivo().then(configurarLector).catch(() => configurarLector(false)),
]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <VoiceProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </VoiceProvider>,
  );
});
