import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/fraunces/700.css';
import './styles/globals.css';
import './styles/layout.css';
import { aplicarTema } from './styles/issue';

aplicarTema();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>
);