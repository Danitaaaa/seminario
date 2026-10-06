import './estilos/global.css';
import './estilos/layout.css';
import { aplicarTema } from './estilos/tema';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

aplicarTema ();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
