import React, { useState, useEffect } from 'react';
import { Users, UserMinus, BookOpen, GraduationCap } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function Inicio() {
  // NUEVO 1: Agregamos anios_disponibles a nuestro estado inicial
  const [estadisticas, setEstadisticas] = useState({
    anios_disponibles: [] as number[],
    total_activos: 0,
    total_inactivos: 0,
    por_nivel: [],
    por_curso: []
  });
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // NUEVO 2: Creamos una variable para saber qué año quiere ver el usuario
  const [anioSeleccionado, setAnioSeleccionado] = useState('');

  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setCargando(true); 

    // NUEVO 3: Construimos la URL agregando dinámicamente el colegio y el año
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
      
  // NUEVO 4: Le decimos a React que vuelva a calcular todo si cambia el Colegio O el Año
  }, [colegioSeleccionado, anioSeleccionado]); 

  return (
    <div className="space-y-6">
      
      {/* CABECERA CON EL SELECTOR DE AÑO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Control (Dashboard)</h2>
        
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            📅 Año Escolar:
          </label>
          <select 
            value={anioSeleccionado} 
            onChange={(e) => setAnioSeleccionado(e.target.value)}
            className="border-none bg-transparent font-bold text-blue-600 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="">Histórico Completo (Todos)</option>
            {estadisticas.anios_disponibles.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MANEJO DE ESTADOS DE CARGA Y ERROR MEJORADOS */}
      {cargando ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center animate-pulse">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Calculando métricas del año seleccionado...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
          <p className="text-red-600 font-bold text-lg mb-2">Ups, algo salió mal</p>
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <>
          {/* BLOQUE 1: TARJETAS DE INDICADORES PRINCIPALES (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 p-4 rounded-lg text-blue-600">
                <Users size={28} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Total Activos</p>
                <p className="text-3xl font-bold text-gray-900">{estadisticas.total_activos}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="bg-red-100 p-4 rounded-lg text-red-600">
                <UserMinus size={28} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Retiros / Bajas</p>
                <p className="text-3xl font-bold text-gray-900">{estadisticas.total_inactivos}</p>
              </div>
            </div>

          </div>

          {/* BLOQUE 2: DESGLOSE DETALLADO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Desglose por Nivel de Enseñanza */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                <GraduationCap className="text-blue-600" size={24} />
                <h3 className="text-lg font-bold text-gray-800">Distribución por Nivel</h3>
              </div>
              
              <div className="space-y-4">
                {estadisticas.por_nivel.map((nivel: any, index: number) => (
                  <div key={index} className="flex justify-between items-center group">
                    <span className="text-gray-700 font-medium">{nivel.nombre}</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full group-hover:bg-blue-100 transition-colors">
                      {nivel.cantidad} alumnos
                    </span>
                  </div>
                ))}
                {estadisticas.por_nivel.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No hay matrículas activas registradas para este periodo.</p>
                )}
              </div>
            </div>

            {/* Desglose por Curso Específico */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                <BookOpen className="text-emerald-600" size={24} />
                <h3 className="text-lg font-bold text-gray-800">Distribución por Curso</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {estadisticas.por_curso.map((curso: any, index: number) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-gray-600">{curso.nombre}</span>
                    <span className="font-semibold text-gray-800">{curso.cantidad}</span>
                  </div>
                ))}
                {estadisticas.por_curso.length === 0 && (
                  <p className="text-sm text-gray-500 italic col-span-2">No hay cursos con alumnos activos en este periodo.</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}