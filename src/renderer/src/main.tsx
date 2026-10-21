import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app';
import './styles/globals.css';
import './styles/layout.css';
import { aplicarTema } from './styles/issue';

aplicarTema();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>
);