import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Users, Settings, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 shrink-0">
          <h2 className="font-semibold text-gray-700">Sistema Transaccional</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">Usuario Activo</p>
              <p className="text-xs text-gray-500">Director EE</p>
            </div>
            <button className="ml-4 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}