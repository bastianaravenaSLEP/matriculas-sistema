import React, { useState, useEffect } from 'react';
import { Users, UserMinus, BookOpen, GraduationCap } from 'lucide-react';

export default function Inicio() {
  const [estadisticas, setEstadisticas] = useState({
    total_activos: 0,
    total_inactivos: 0,
    por_nivel: [],
    por_curso: []
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/dashboard/estadisticas')
      .then(res => {
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
  }, []);

  if (cargando) return <div className="text-gray-500 font-medium animate-pulse">Cargando panel de control...</div>;
  if (error) return <div className="text-red-500 font-medium">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Panel de Control (Dashboard)</h2>

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
              <p className="text-sm text-gray-500 italic">No hay matrículas activas registradas.</p>
            )}
          </div>
        </div>

        {/* Desglose por Curso Específico */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
            <BookOpen className="text-emerald-600" size={24} />
            <h3 className="text-lg font-bold text-gray-800">Distribución por Curso</h3>
          </div>
          
          {/* Se utiliza grid-cols-2 para mostrar los cursos en dos columnas y ahorrar espacio visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {estadisticas.por_curso.map((curso: any, index: number) => (
              <div key={index} className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-gray-600">{curso.nombre}</span>
                <span className="font-semibold text-gray-800">{curso.cantidad}</span>
              </div>
            ))}
            {estadisticas.por_curso.length === 0 && (
              <p className="text-sm text-gray-500 italic col-span-2">No hay cursos con alumnos activos.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}