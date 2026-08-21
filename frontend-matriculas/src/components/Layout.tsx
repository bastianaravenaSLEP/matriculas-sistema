import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, Users, LogOut,Activity } from 'lucide-react';

interface Establecimiento {
  id_establecimiento: number;
  rbd: string;
  nombre: string;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Recuperamos los datos del usuario que guardamos en el Login
  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;

  // Estado para el colegio seleccionado (Forzado al ID del usuario si es COLEGIO)
  const [colegioSeleccionado, setColegioSeleccionado] = useState<string>(
    usuario?.rol === 'COLEGIO' ? String(usuario.id_establecimiento) : ''
  );

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);

  // 1. CARGAMOS LOS ESTABLECIMIENTOS PARA TODOS LOS ROLES (Necesario para mostrar el nombre del colegio)[cite: 7]
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://127.0.0.1:8000/establecimientos', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Error al cargar colegios');
          return res.json();
        })
        .then(data => setEstablecimientos(data))
        .catch(err => console.error("Error cargando establecimientos:", err));
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };
  
  const isActive = (path: string) => location.pathname === path;

  // Encontramos el nombre del colegio actual para mostrarlo si es director
  const colegioActual = establecimientos.find(e => e.id_establecimiento.toString() === colegioSeleccionado);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider">SLEP RGM</h1>
          <p className="text-xs text-slate-400 mt-1">Registro de Matrícula</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            <Home size={20} /> Inicio
          </Link>
          <Link to="/matriculas" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/matriculas') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            <FolderOpen size={20} /> Matrículas
          </Link>
          <Link to="/estudiantes" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/estudiantes') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            <Users size={20} /> Estudiantes
          </Link>
          <Link to="/auditoria" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/auditoria') ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
           <Activity size={20} /> Trazabilidad & Auditoría
          </Link>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shrink-0">
         
         {/* Lado Izquierdo (Selector SLEP o Título Fijo Colegio) */}
         <div className="flex-1">
            {usuario?.rol === 'SLEP' ? (
              <select 
                value={colegioSeleccionado}
                onChange={(e) => setColegioSeleccionado(e.target.value)}
                className="border border-slate-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm w-96 font-medium text-slate-700"
              >
                <option value="">🌍 Todos los Establecimientos (Visión Global)</option>
                {establecimientos.map((est) => (
                  <option key={est.id_establecimiento} value={est.id_establecimiento}>
                    RBD: {est.rbd} - {est.nombre}
                  </option>
                ))}
              </select>
            ) : (
              // Si es rol 'COLEGIO', muestra únicamente el nombre de su establecimiento asignado de forma limpia
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-md">Mi Establecimiento</span>
                <h2 className="text-base font-bold text-gray-800">
                  {colegioActual ? `${colegioActual.nombre} (RBD: ${colegioActual.rbd})` : 'Cargando información...'}
                </h2>
              </div>
            )}
          </div>

         {/* Lado Derecho (Usuario y Botón Salir) */}
         <div className="flex items-center gap-5">
           <div className="text-right">
            <p className="text-sm font-medium text-gray-700">
              {usuario ? usuario.nombre : 'Usuario Activo'}
            </p>
            <p className="text-xs text-gray-500">
              {usuario ? `Rol: ${usuario.rol}` : 'Director EE'}
            </p>
          </div>
          <button 
            onClick={cerrarSesion}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
         </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <Outlet context={{ colegioSeleccionado }} />
        </div>
      </main>
    </div>
  );
}