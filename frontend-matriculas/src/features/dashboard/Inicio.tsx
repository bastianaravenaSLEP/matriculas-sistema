import React, { useState, useMemo } from 'react';
import { Users, UserMinus, GraduationCap, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useInicio2 } from './hooks/useInicio2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Inicio() {
  const {
    estadisticas,
    cargando,
    error,
    anioSeleccionado,
    setAnioSeleccionado
  } = useInicio2();

  // Controla qué acordeón está abierto
  const [nivelExpandido, setNivelExpandido] = useState<string | null>(null);
  
  // Controla QUÉ datos está mostrando el gráfico ('activos', 'retiros', o el nombre de un nivel ej: '1° Básico')
  const [graficoActivo, setGraficoActivo] = useState<string>('activos');

  // ============================================================================
  // AGRUPACIÓN INTELIGENTE DE CURSOS
  // ============================================================================
  const cursosAgrupados = useMemo(() => {
    if (!estadisticas?.por_curso || !Array.isArray(estadisticas.por_curso)) return [];
    
    const agrupacion: Record<string, { display: string, total: number, cursos: any[] }> = {};
    
    estadisticas.por_curso.forEach((curso: any) => {
      const nombreSeguro = String(curso?.nombre || "");
      if (!nombreSeguro) return;

      const match = nombreSeguro.match(/^(.*?)\s+([A-Za-z])$/);
      const nombreBase = match ? match[1].trim() : nombreSeguro.trim();
      const key = nombreBase.toLowerCase();
      
      if (!agrupacion[key]) {
        const displayFormat = nombreBase.charAt(0).toUpperCase() + nombreBase.slice(1).toLowerCase();
        agrupacion[key] = { display: displayFormat, total: 0, cursos: [] };
      }
      
      agrupacion[key].total += Number(curso?.cantidad || 0);
      agrupacion[key].cursos.push(curso);
    });
    
    return Object.values(agrupacion);
  }, [estadisticas]);

  // Manejador del clic en el acordeón
  const toggleNivel = (nombreNivel: string) => {
    if (nivelExpandido === nombreNivel) {
      setNivelExpandido(null);
      setGraficoActivo('activos'); // Si cerramos el acordeón, volvemos al gráfico global
    } else {
      setNivelExpandido(nombreNivel);
      setGraficoActivo(nombreNivel); // El gráfico ahora mostrará la data de este nivel
    }
  };

// ============================================================================
  // DATOS DEL GRÁFICO LATERAL (100% REALES DESDE LA BD)
  // ============================================================================
  const datosGrafico = useMemo(() => {
    // 1. Verificamos si el backend nos envió el historial real
    if (!estadisticas?.historico || !Array.isArray(estadisticas.historico)) return [];

    // 2. Mapeamos directamente el arreglo histórico real que armó Python
    return estadisticas.historico.map((hist: any) => {
      let valorParaGrafico = 0;

      if (graficoActivo === 'activos') {
        valorParaGrafico = hist.activos || 0;
      } else if (graficoActivo === 'retiros') {
        valorParaGrafico = hist.retiros || 0;
      } else {
        // graficoActivo tiene el nombre del nivel (ej: "1° Medio")
        // Lo buscamos en el diccionario de cursos reales que mandó Python
        // Comparamos en minúsculas para evitar problemas de formato
        const llaveEncontrada = Object.keys(hist.cursos || {}).find(
          k => k.toLowerCase() === graficoActivo.toLowerCase()
        );
        valorParaGrafico = llaveEncontrada ? hist.cursos[llaveEncontrada] : 0;
      }

      return {
        anio: String(hist.anio),
        cantidad: valorParaGrafico
      };
    }); 
  }, [estadisticas, graficoActivo]);

  // Configuración de colores y títulos dinámicos para el gráfico
  let tituloGrafico = "";
  let colorCabecera = "";
  if (graficoActivo === 'activos') {
    tituloGrafico = "Estudiantes Activos (General)";
    colorCabecera = "bg-blue-950";
  } else if (graficoActivo === 'retiros') {
    tituloGrafico = "Retiros Oficiales (General)";
    colorCabecera = "bg-red-700";
  } else {
    tituloGrafico = `Ocupación: ${graficoActivo}`;
    colorCabecera = "bg-emerald-700";
  }

  return (
    <div className="space-y-6">
      
      {/* --- CABECERA --- */}
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
            value={anioSeleccionado || ''} 
            onChange={(e) => setAnioSeleccionado(e.target.value)}
            className="border-none bg-transparent font-extrabold text-blue-900 focus:ring-0 cursor-pointer outline-none text-sm"
          >
            <option value="">Histórico (Todos)</option>
            {estadisticas?.anios_disponibles?.map((anio: number) => (
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
          {/* --- TARJETAS SUPERIORES --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div 
              onClick={(e) => { e.preventDefault(); setGraficoActivo('activos'); setNivelExpandido(null); }}
              className={`bg-white p-6 rounded-r-lg shadow-sm border transition-all cursor-pointer flex items-center gap-5 group relative ${graficoActivo === 'activos' ? 'border-blue-900 ring-2 ring-blue-100 bg-blue-50/30' : 'border-gray-200 border-l-4 border-l-blue-900 hover:bg-blue-50'}`}
            >
              <div className={`p-3 rounded-md transition-transform ${graficoActivo === 'activos' ? 'bg-blue-900 text-white shadow-md scale-110' : 'bg-blue-100 text-blue-900 group-hover:scale-110'}`}>
                <Users size={24} />
              </div>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${graficoActivo === 'activos' ? 'text-blue-900' : 'text-gray-500'}`}>Total Activos</p>
                <p className="text-3xl font-black text-blue-950">{estadisticas?.total_activos || 0}</p>
              </div>
              <div className="ml-auto text-blue-300">
                 <BarChart3 size={24} className={graficoActivo === 'activos' ? 'text-blue-900' : 'opacity-50'} />
              </div>
            </div>

            <div 
              onClick={(e) => { e.preventDefault(); setGraficoActivo('retiros'); setNivelExpandido(null); }}
              className={`bg-white p-6 rounded-r-lg shadow-sm border transition-all cursor-pointer flex items-center gap-5 group relative ${graficoActivo === 'retiros' ? 'border-red-600 ring-2 ring-red-100 bg-red-50/30' : 'border-gray-200 border-l-4 border-l-red-600 hover:bg-red-50'}`}
            >
              <div className={`p-3 rounded-md transition-transform ${graficoActivo === 'retiros' ? 'bg-red-600 text-white shadow-md scale-110' : 'bg-red-100 text-red-600 group-hover:scale-110'}`}>
                <UserMinus size={24} />
              </div>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${graficoActivo === 'retiros' ? 'text-red-700' : 'text-gray-500'}`}>Retiros Oficiales</p>
                <p className="text-3xl font-black text-gray-800">{estadisticas?.total_inactivos || 0}</p>
              </div>
              <div className="ml-auto text-red-300">
                 <BarChart3 size={24} className={graficoActivo === 'retiros' ? 'text-red-600' : 'opacity-50'} />
              </div>
            </div>

          </div>

          {/* --- ÁREA PRINCIPAL --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* 1. ACORDEÓN DE CURSOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-200 pb-3">
                <GraduationCap className="text-blue-900" size={24} />
                <h3 className="text-lg font-extrabold text-gray-800 uppercase tracking-wide">Distribución por Curso</h3>
              </div>
              
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {cursosAgrupados.map((grupo: any, index: number) => {
                  const estaExpandido = nivelExpandido === grupo.display;

                  return (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden transition-all">
                      <button 
                        type="button"
                        onClick={() => toggleNivel(grupo.display)}
                        className={`w-full flex justify-between items-center p-3 sm:p-4 transition-colors ${estaExpandido ? 'bg-emerald-700 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}
                      >
                        <span className="font-bold text-sm sm:text-base text-left">{grupo.display}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-extrabold px-3 py-1 rounded-full text-xs shadow-sm ${estaExpandido ? 'bg-white text-emerald-800' : 'bg-blue-100 text-blue-900'}`}>
                            {grupo.total} alumnos
                          </span>
                          {estaExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>

                      {estaExpandido && (
                        <div className="bg-white p-4 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {grupo.cursos.map((curso: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-md">
                                <span className="text-emerald-900 text-sm font-semibold truncate pr-2" title={curso.nombre || 'Desconocido'}>
                                  {curso.nombre || 'Desconocido'}
                                </span>
                                <span className="font-bold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded text-xs shadow-sm">
                                  {curso.cantidad || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {cursosAgrupados.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 font-medium">No hay registros de cursos para este periodo.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. GRÁFICO COMPARATIVO INLINE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[400px]">
              <div className={`p-5 border-b rounded-t-xl text-white transition-colors duration-300 ${colorCabecera}`}>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <BarChart3 size={20} />
                  Comparativa Anual: {tituloGrafico}
                </h3>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-center min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontWeight: 600, fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                      {datosGrafico.map((entry, index) => {
                        const anioActualView = anioSeleccionado || String(new Date().getFullYear());
                        const esSeleccionado = entry.anio === String(anioActualView);
                        
                        let color = '#D1D5DB'; 
                        if (graficoActivo === 'activos') {
                          color = esSeleccionado ? '#1E3A8A' : '#93C5FD'; // Azul
                        } else if (graficoActivo === 'retiros') {
                          color = esSeleccionado ? '#DC2626' : '#FCA5A5'; // Rojo
                        } else {
                          color = esSeleccionado ? '#047857' : '#6EE7B7'; // Esmeralda para niveles
                        }

                        return <Cell key={`cell-${index}`} fill={color} className="transition-all duration-300" />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100 text-xs text-gray-500 text-center">
                El gráfico destaca el año filtrado. Si tu base de datos aún no provee el histórico completo, los años grises muestran una proyección de tendencia.
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}