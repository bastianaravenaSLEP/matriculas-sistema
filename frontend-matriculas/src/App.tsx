import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import Matriculas from './pages/Matriculas';
import NuevaMatricula from './pages/NuevaMatricula';
import Estudiantes from './pages/Estudiantes';
import CuestionarioRetiro from './pages/CuestionarioRetiro';
import Login from './pages/Login';

// ============================================================================
// COMPONENTE GUARDIÁN (Protección de Rutas)
// ============================================================================
// Este componente envuelve las partes privadas. Si no hay token, te expulsa al login.
const RutaProtegida = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Si no hay token en la memoria del navegador, redirige inmediatamente a /login
    return <Navigate to="/login" replace />;
  }
  
  // Si hay token, renderiza el componente hijo (en este caso, el Layout)
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. RUTA PÚBLICA (La única que se puede ver sin iniciar sesión) */}
        <Route path="/login" element={<Login />} />

        {/* 2. RUTAS PRIVADAS (Protegidas por el Guardián) */}
        <Route 
          path="/" 
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          {/* Todas estas rutas hijas heredan la protección del Layout */}
          <Route index element={<Inicio />} />
          <Route path="matriculas" element={<Matriculas />} />
          <Route path="matriculas/nueva" element={<NuevaMatricula />} />
          <Route path="estudiantes" element={<Estudiantes />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}