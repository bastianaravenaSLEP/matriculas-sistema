import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rol, setRol] = useState('COLEGIO');
  const [cargando, setCargando] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rol })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.detail || 'Error al iniciar sesión');

      localStorage.setItem('token', datos.access_token);
      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // --- NUEVA LÓGICA DE LOGIN CON GOOGLE ---
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: credentialResponse.credential, // El token crudo que envía Google
          rol: rol // El rol que está seleccionado en el combobox
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.detail || 'Error al iniciar sesión con Google');

      localStorage.setItem('token', datos.access_token);
      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      {/* Footer/Header Institucional Falso para dar contexto */}
      <div className="absolute top-0 w-full h-2 flex">
        <div className="w-1/2 bg-blue-900"></div>
        <div className="w-1/2 bg-red-600"></div>
      </div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
        
      <div className="bg-blue-950 p-8 text-center border-b-4 border-red-600">
          <p className="text-blue-200 text-xs font-bold tracking-widest uppercase mb-4">Ministerio de Educación</p>
          
          {/* Contenedor flex con alineación centrada */}
          <div className="flex flex-col items-center justify-center my-2">
              <img 
                src="/images/logo_slep.png"
                alt="Logo SLEP Valparaíso" 
                className="max-h-20 w-auto object-contain" 
              /> 
          </div>          
          
          <p className="text-blue-100 mt-4 text-sm font-medium">Plataforma Oficial del Registro General de Matrículas</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-6 text-center font-bold border border-red-200 flex items-center justify-center gap-2">
              <ShieldCheck size={18} /> {error}
            </div>
          )}

          {/* COMBBOX DE ROLES MOVIDO ARRIBA PARA QUE SIRVA PARA AMBOS MÉTODOS */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">1. Seleccione su Perfil Institucional</label>
            <select 
              value={rol} onChange={(e) => setRol(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm bg-gray-50 focus:bg-white font-medium text-gray-700 cursor-pointer"
            >
              <option value="COLEGIO">Establecimiento Educacional</option>
              <option value="SLEP">Administración Central (SLEP)</option>
            </select>
          </div>

          {/* 🌟 AQUÍ ESTÁ LA INTEGRACIÓN DEL BOTÓN DE GOOGLE */}
          <div className="mb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('El inicio de sesión con Google fue cancelado o falló.')}
              useOneTap
              theme="filled_blue"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">O INGRESE CON CONTRASEÑA</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Correo Institucional</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="usuario@slepvalparaiso.cl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Perfil de Acceso</label>
              <select 
                value={rol} onChange={(e) => setRol(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm bg-gray-50 focus:bg-white font-medium text-gray-700 cursor-pointer"
              >
                <option value="COLEGIO">Establecimiento Educacional</option>
                <option value="SLEP">Administración Central (SLEP)</option>
              </select>
            </div>

            <button 
              type="submit" disabled={cargando}
              className="w-full bg-blue-900 text-white font-bold py-3 rounded-md hover:bg-blue-800 transition-colors disabled:opacity-50 mt-4 shadow-md"
            >
              {cargando ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-500 font-medium">
        © {new Date().getFullYear()} Servicio Local de Educación Pública Valparaíso. Todos los derechos reservados.
      </p>
    </div>
  );
}