import React from 'react';
import { Filter, Calendar, User, Building, Info } from 'lucide-react';
import { useAuditoria } from './hooks/useAuditoria';

export default function Auditoria() {
  const {
    registros,
    cargando,
    error,
    tipoMovimientoFiltro,
    setTipoMovimientoFiltro,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin
  } = useAuditoria();

  const renderBadgeMovimiento = (tipo: string) => {
    switch (tipo) {
      case 'ALTA':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold whitespace-nowrap">ALTA DE MATRÍCULA</span>;
      case 'RETIRO':
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold whitespace-nowrap">RETIRO ESCOLAR</span>;
      case 'CUESTIONARIO':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold whitespace-nowrap">ENCUESTA APODERADO</span>;
      case 'CAMBIO_CURSO':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">CAMBIO DE CURSO</span>;
      case 'ACTUALIZACION':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold whitespace-nowrap">ACTUALIZACIÓN</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold whitespace-nowrap">{tipo}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Trazabilidad y Auditoría de Movimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Bitácora inmutable de eventos gestionada automáticamente en base de datos para supervisión central.</p>
      </div>

      {/* Panel de Filtros Específicos */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-gray-400 mr-2">
          <Filter size={20} />
          <span className="text-sm font-bold text-gray-700">Filtros:</span>
        </div>
        
        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1">Tipo de Movimiento</label>
          <select 
            value={tipoMovimientoFiltro} 
            onChange={(e) => setTipoMovimientoFiltro(e.target.value)} 
            className="border border-gray-300 rounded-lg p-2 text-sm w-52 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los movimientos</option>
            <option value="ALTA">Alta de Matrícula</option>
            <option value="RETIRO">Retiro Escolar</option>
            <option value="CUESTIONARIO">Encuesta de Apoderado</option>
            <option value="CAMBIO_CURSO">Cambio de Curso</option>
            <option value="ACTUALIZACION">Actualización de Ficha</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1">Desde</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
            className="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-gray-500 uppercase mb-1">Hasta</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)} 
            className="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <button 
          onClick={() => { setTipoMovimientoFiltro(''); setFechaInicio(''); setFechaFin(''); }}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Vista de Carga, Error y Tabla */}
      {cargando ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-sm border border-gray-200">
          Consultando bitácora de trazabilidad...
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-600 font-medium">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center text-xs font-medium text-gray-500">
            <span>Total de registros encontrados: <strong className="text-gray-800">{registros.length}</strong></span>
            <span className="italic">Auditoría en Formato Largo</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                  <th className="p-4">Tipo Movimiento</th>
                  <th className="p-4">Detalle de la Acción</th>
                  <th className="p-4">Establecimiento</th>
                  <th className="p-4">Matrícula</th>
                  <th className="p-4">Usuario Ejecutor</th>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4 text-center">Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No se encontraron registros de auditoría para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  registros.map((reg) => (
                    <tr key={reg.id_auditoria} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">{renderBadgeMovimiento(reg.tipo_movimiento)}</td>
                      <td className="p-4 text-gray-800 text-xs max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                          <span>{reg.detalle}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building size={14} className="text-gray-400 shrink-0" />
                          <span>{reg.nombre_establecimiento}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-blue-600 font-bold text-xs">#{reg.id_matricula}</td>
                      <td className="p-4 text-gray-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span>{reg.nombre_ejecutor}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400 shrink-0" />
                          <span>{reg.fecha}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <details className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-bold">
                          <summary>Ver JSON</summary>
                          <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-lg text-[9px] text-left max-w-xs overflow-auto shadow-inner">
                            {JSON.stringify(reg.datos_nuevos || reg.datos_anteriores, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}