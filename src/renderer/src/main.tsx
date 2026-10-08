import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './estilos/global.css';
import './estilos/globals.css';
import './estilos/layout.css';
import { aplicarTema } from './estilos/tema';

aplicarTema();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>
);