import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import './styles/layout.css';
import { aplicarTema } from './styles/tema';

aplicarTema();

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <HashRouter>
    <App />
  </HashRouter>
);