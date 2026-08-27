import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/Login';
import HomeMenu from '../features/home/NuevoInicio';
import Estadisticas from '../features/dashboard/Inicio';
import Estudiantes from '../features/estudiantes/Estudiantes';
import Matriculas from '../features/matriculas/Matriculas';
import NuevaMatricula from '../features/matriculas/NuevaMatricula';
import CuestionarioRetiro from '../features/matriculas/CuestionarioRetiro';
import Verificador from '../features/documentos/Verificador';
import Auditoria from '../features/auditoria/Auditoria';
import Layout from '../components/Layout';

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
        <Route path="/encuesta-retiro/:id" element={<CuestionarioRetiro />} />

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
          
          <Route index element={<HomeMenu />} />
          <Route path="inicio" element={<Estadisticas/>} />
          <Route path="/verificar" element={<Verificador />} />
          <Route path="matriculas" element={<Matriculas />} />
          <Route path="matriculas/nueva" element={<NuevaMatricula />} />
          <Route path="estudiantes" element={<Estudiantes />} />
          <Route path="auditoria" element={<Auditoria />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}