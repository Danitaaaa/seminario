import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app';
import './styles/globals.css';
import './styles/layout.css';
import { aplicarPreferencia } from './hooks/usarModo';
import { cargarReglas } from './permisos';

aplicarPreferencia();

cargarReglas()
  .catch((e) => console.error('No se pudieron cargar los permisos', e))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <HashRouter>
        <App />
      </HashRouter>,
    );
  });