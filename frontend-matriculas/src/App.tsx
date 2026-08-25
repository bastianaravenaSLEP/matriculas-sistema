import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import Matriculas from './pages/Matriculas';
import NuevaMatricula from './pages/NuevaMatricula';
import Estudiantes from './pages/Estudiantes';
import CuestionarioRetiro from './pages/CuestionarioRetiro';
import Login from './pages/Login';
import Auditoria from './pages/Auditoria';

// ============================================================================
// COMPONENTE GUARDIÁN GENERAL (Protección de Sesión)
// ============================================================================
const RutaProtegida = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// ============================================================================
// NUEVO: COMPONENTE GUARDIÁN POR ROLES (Para bloquear Trazabilidad)
// ============================================================================
const RutaRestringida = ({ children, rolesBloqueados }: { children: React.ReactNode, rolesBloqueados: string[] }) => {
  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;

  // Si el rol del usuario actual está en la lista de bloqueados, lo mandamos al inicio
  if (usuario && rolesBloqueados.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. RUTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/encuesta-retiro/:id" element={<CuestionarioRetiro />} />

        {/* 2. RUTAS PRIVADAS (Protegidas por sesión general) */}
        <Route 
          path="/" 
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="matriculas" element={<Matriculas />} />
          <Route path="matriculas/nueva" element={<NuevaMatricula />} />
          <Route path="estudiantes" element={<Estudiantes />} />
          
          {/* 3. RUTA RESTRINGIDA (Solo roles autorizados pueden ver Auditoría) */}
          <Route 
            path="auditoria" 
            element={
              <RutaRestringida rolesBloqueados={['Visualizador_Colegio', 'Colegio']}>
                <Auditoria />
              </RutaRestringida>
            } 
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}