import React, { useState, useEffect } from 'react';
import { Users, UserMinus, BookOpen, GraduationCap } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function Inicio() {
  const [estadisticas, setEstadisticas] = useState({
    anios_disponibles: [] as number[],
    total_activos: 0,
    total_inactivos: 0,
    por_nivel: [],
    por_curso: []
  });
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setCargando(true); 

    let url = `http://127.0.0.1:8000/dashboard/estadisticas?`;
    const params = new URLSearchParams();
    if (colegioSeleccionado) params.append('establecimiento_id', colegioSeleccionado);
    if (anioSeleccionado) params.append('anio', anioSeleccionado);
    
    url += params.toString();

    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })
      .then(res => {
        if (res.status === 401) throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        if (!res.ok) throw new Error('Error al cargar métricas');
        return res.json();
      })
      .then(data => {
        setEstadisticas(data);
        setCargando(false);
      })
      .catch(err => {
        setError(err.message);
        setCargando(false);
      });
  }, [colegioSeleccionado, anioSeleccionado]); 

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950">Panel de Control General</h2>
          <p className="text-sm text-gray-500 font-medium">Indicadores y estadísticas de matrícula oficial</p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-md border border-gray-300 shadow-sm flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Año Escolar:
          </label>
          <select 
            value={anioSeleccionado} 
            onChange={(e) => setAnioSeleccionado(e.target.value)}
            className="border-none bg-transparent font-extrabold text-blue-900 focus:ring-0 cursor-pointer outline-none text-sm"
          >
            <option value="">Histórico (Todos)</option>
            {estadisticas.anios_disponibles.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-900 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium text-sm">Consultando indicadores oficiales...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center shadow-sm">
          <p className="text-red-700 font-bold text-lg mb-1">Error de Sistema</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-r-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-900 flex items-center gap-5">
              <div className="p-3 bg-blue-50 rounded-md text-blue-900">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Activos</p>
                <p className="text-3xl font-black text-blue-950">{estadisticas.total_activos}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-r-lg shadow-sm border border-gray-200 border-l-4 border-l-red-600 flex items-center gap-5">
              <div className="p-3 bg-red-50 rounded-md text-red-600">
                <UserMinus size={24} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Retiros Oficiales</p>
                <p className="text-3xl font-black text-gray-800">{estadisticas.total_inactivos}</p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-200 pb-3">
                <GraduationCap className="text-blue-900" size={20} />
                <h3 className="text-md font-extrabold text-gray-800 uppercase tracking-wide">Distribución por Nivel</h3>
              </div>
              
              <div className="space-y-3">
                {estadisticas.por_nivel.map((nivel: any, index: number) => (
                  <div key={index} className="flex justify-between items-center group bg-gray-50 p-3 rounded-md border border-gray-100">
                    <span className="text-gray-700 font-bold text-sm">{nivel.nombre}</span>
                    <span className="font-extrabold text-white bg-blue-900 px-3 py-1 rounded text-xs shadow-sm">
                      {nivel.cantidad}
                    </span>
                  </div>
                ))}
                {estadisticas.por_nivel.length === 0 && (
                  <p className="text-sm text-gray-500 italic p-4 text-center">Sin registros activos.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-200 pb-3">
                <BookOpen className="text-cyan-700" size={20} />
                <h3 className="text-md font-extrabold text-gray-800 uppercase tracking-wide">Distribución por Curso</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {estadisticas.por_curso.map((curso: any, index: number) => (
                  <div key={index} className="flex justify-between items-center border-b border-dashed border-gray-200 pb-2">
                    <span className="text-gray-600 text-sm font-medium">{curso.nombre}</span>
                    <span className="font-bold text-gray-900 text-sm">{curso.cantidad}</span>
                  </div>
                ))}
                {estadisticas.por_curso.length === 0 && (
                  <p className="text-sm text-gray-500 italic col-span-2 text-center py-4">Sin registros activos.</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}