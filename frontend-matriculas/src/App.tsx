import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Matriculas from './pages/Matriculas';
import NuevaMatricula from './pages/NuevaMatricula';
import Estudiantes from './pages/Estudiantes';
import CuestionarioRetiro from './pages/CuestionarioRetiro';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bienvenido al RGM</h1>
              <p className="text-gray-600 mt-2">Selecciona "Matrículas" en el menú izquierdo para ver los datos.</p>
            </div>
          } />
          <Route path="matriculas" element={<Matriculas />} />
          <Route path="matriculas/nueva" element={<NuevaMatricula />} /> 
          <Route path="estudiantes" element={<Estudiantes />} />
          <Route path="/encuesta-retiro/:id" element={<CuestionarioRetiro />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;