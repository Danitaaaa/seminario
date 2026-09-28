import { Routes, Route, Link } from 'react-router-dom';
import { PruebaPage } from './pages/Prueba/PruebaPage';
import { ArchivosPage } from './pages/Archivos/ArchivosPage';

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Proyecto B</h1>
      <Link to="/archivos">Cargar Archivo +</Link>
      <Routes>
        <Route path="/" element={<PruebaPage />} />
        <Route path="/archivos" element={<ArchivosPage />} />
      </Routes>
    </div>
  );
}