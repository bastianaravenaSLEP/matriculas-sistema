import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, Users, LogOut, Activity, Landmark, PieChart} from 'lucide-react';

interface Establecimiento {
  id_establecimiento: number;
  rbd: string;
  nombre: string;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;

  const esPerfilGlobal = ['SLEP', 'admin_slep', 'Visualizador_SLEP'].includes(usuario?.rol);
  const puedeVerAuditoria = !['Colegio', 'Visualizador_Colegio'].includes(usuario?.rol);

  const [colegioSeleccionado, setColegioSeleccionado] = useState<string>(
    !esPerfilGlobal ? String(usuario?.id_establecimiento) : ''
  );

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://127.0.0.1:8000/establecimientos', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setEstablecimientos(data))
        .catch(err => console.error(err));
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };
  
  const isActive = (path: string) => location.pathname === path;
  const colegioActual = establecimientos.find(e => e.id_establecimiento.toString() === colegioSeleccionado);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      
      {/* HEADER PRINCIPAL (Menú Horizontal) */}
      <header className="bg-blue-950 text-white shrink-0 z-20 relative shadow-md">
        {/* Barra de colores institucional en el borde superior */}
        <div className="absolute top-0 left-0 w-full h-1 flex">
          <div className="w-1/2 bg-blue-700"></div>
          <div className="w-1/2 bg-red-600"></div>
        </div>

        <div className="px-9 h-28 flex items-center justify-between mt-1">
                
{/* IZQUIERDA: Logo con Insignia Blanca Institucional */}
            <Link to="/" className="flex items-center gap-3 group cursor-pointer focus:outline-none">
            <img 
              src="/images/logo_slep.png" 
              alt="Logo SLEP Valparaíso" 
              className="h-20 w-auto object-contain group-hover:opacity-90 transition-opacity" 
            />
          
          </Link>
           
  

          {/* CENTRO: Navegación Horizontal */}
          <nav className="hidden md:flex items-center gap-2">
           
            <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${isActive('/') ? 'bg-blue-800 text-white shadow-inner border-b-2 border-red-500' : 'text-blue-200 hover:bg-blue-900 hover:text-white border-b-2 border-transparent'}`}>
              <Home size={18} /> Inicio
            </Link>
            <Link to="/matriculas" className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${isActive('/matriculas') ? 'bg-blue-800 text-white shadow-inner border-b-2 border-red-500' : 'text-blue-200 hover:bg-blue-900 hover:text-white border-b-2 border-transparent'}`}>
              <FolderOpen size={18} /> Matrículas
            </Link>
            <Link to="/estudiantes" className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${isActive('/estudiantes') ? 'bg-blue-800 text-white shadow-inner border-b-2 border-red-500' : 'text-blue-200 hover:bg-blue-900 hover:text-white border-b-2 border-transparent'}`}>
              <Users size={18} /> Estudiantes
            </Link>
             <Link to="/inicio" className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${isActive('/dashboard') ? 'bg-blue-800 text-white shadow-inner border-b-2 border-red-500' : 'text-blue-200 hover:bg-blue-900 hover:text-white border-b-2 border-transparent'}`}>
              <PieChart size={18} /> Panel de Control
            </Link>
            
            {puedeVerAuditoria && (
              <Link to="/auditoria" className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${isActive('/auditoria') ? 'bg-blue-800 text-white shadow-inner border-b-2 border-red-500' : 'text-blue-200 hover:bg-blue-900 hover:text-white border-b-2 border-transparent'}`}>
               <Activity size={18} /> Trazabilidad & Auditoría
              </Link>
              
            )}
          </nav>

          {/* DERECHA: Usuario y Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-tight">
                {usuario ? usuario.nombre : 'Usuario Activo'}
              </p>
              <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wide mt-0.5">
                Perfil: {usuario ? usuario.rol : 'Cargando...'}
              </p>
            </div>
            <button 
              onClick={cerrarSesion}
              className="text-blue-200 hover:text-red-400 bg-blue-900 hover:bg-blue-950 p-2 rounded-full transition-all border border-blue-800 hover:border-red-400"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* SUB-HEADER (Filtro de Colegio / Contexto) */}
      <div className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0 shadow-sm z-10">
        {esPerfilGlobal ? (
          <div className="flex items-center gap-3 w-full max-w-3xl">
            <span className="text-xs font-bold text-gray-500 uppercase">Filtro Institucional:</span>
            <select 
              value={colegioSeleccionado} onChange={(e) => setColegioSeleccionado(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md py-1.5 px-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm font-bold text-gray-700 cursor-pointer"
            >
              <option value="">🌍 Ver todos los Establecimientos (Nivel Central)</option>
              {establecimientos.map((est) => (
                <option key={est.id_establecimiento} value={est.id_establecimiento}>
                  RBD: {est.rbd} - {est.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-blue-900 text-white font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">Mi Establecimiento</span>
            <h2 className="text-sm font-extrabold text-blue-950">
              {colegioActual ? `${colegioActual.nombre} (RBD: ${colegioActual.rbd})` : 'Cargando información...'}
            </h2>
          </div>
        )}
      </div>
      
      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50">
        <Outlet context={{ colegioSeleccionado }} />
      </main>
    </div>
  );
}