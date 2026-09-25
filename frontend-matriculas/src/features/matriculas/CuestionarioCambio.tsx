import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useCuestionarioCambio } from './hooks/useCuestionarioCambio';

const OPCIONES_CAMBIO = [
  "Problemas de convivencia en su curso actual",
  "Mi hijo/a no ha podido integrarse en su curso actual",
  "Por comodidad (cambio de jornada u organización familiar)",
  "Necesidad de apoyo especializado específico en otra sala",
  "Cambio de plan de estudio, electivo o especialidad",
  "Recomendación directa de especialistas o equipo pedagógico",
  "Otro"
];

export default function EncuestaCambioCurso() {
  const {
    rutEstudiante, setRutEstudiante,
    motivosSeleccionados, alternarMotivo,
    motivoDetalle, setMotivoDetalle,
    cargando,
    mensaje,
    handleSubmit
  } = useCuestionarioCambio();

  const [menuAbierto, setMenuAbierto] = useState(false);

  const puedeEnviar = !cargando && rutEstudiante.trim().length >= 8 && motivosSeleccionados.length > 0 && motivoDetalle.trim().length >= 5;

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full relative border border-gray-200">
        <div className="absolute top-0 left-0 right-0 h-2 flex rounded-t-2xl overflow-hidden">
          <div className="w-1/2 bg-blue-700"></div>
          <div className="w-1/2 bg-red-600"></div>
        </div>

        <div className="text-center mb-8 mt-2">
          <img src="/images/logo-slep.negro.png" alt="Logo SLEP" className="h-24 mx-auto mb-5 object-contain" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">Justificación de Traslado</h2>
          <p className="text-sm text-gray-500 mt-3 font-medium">Por normativa institucional, indique y explique el motivo por el cual solicitó el cambio de curso. El traslado se aplicará al enviar este formulario.</p>
        </div>

        {mensaje?.tipo === 'exito' ? (
          <div className="bg-emerald-50 text-emerald-800 p-6 rounded-xl text-center border border-emerald-200 shadow-inner">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-lg">{mensaje.texto}</p>
            <p className="text-sm text-emerald-700 mt-2">El traslado ha quedado oficialmente registrado en la plataforma RGM y se ha emitido el comprobante correspondiente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">
                RUT del Estudiante <span className="text-red-500">*</span> <span className="text-xs text-gray-400 normal-case font-medium">(Sin puntos, con guion)</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Ej: 20123456-7" 
                value={rutEstudiante} 
                onChange={(e) => setRutEstudiante(e.target.value)} 
                disabled={cargando} 
                className="w-full border border-gray-300 rounded-lg p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all bg-gray-50 focus:bg-white" 
              />
            </div>

            {/* Dropdown Multiselección */}
            <div className="relative">
              <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">
                Motivos del traslado <span className="text-red-500">*</span> <span className="text-xs text-blue-700 normal-case font-medium">(Seleccione al menos uno)</span>
              </label>

              <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                disabled={cargando}
                className="w-full border border-gray-300 rounded-lg p-3.5 text-sm font-medium bg-gray-50 hover:bg-white flex justify-between items-center text-left focus:ring-2 focus:ring-blue-900 transition-all cursor-pointer"
              >
                <span className={motivosSeleccionados.length === 0 ? "text-gray-400" : "text-gray-800 font-bold"}>
                  {motivosSeleccionados.length === 0 ? "Haga clic para seleccionar motivos..." : `${motivosSeleccionados.length} motivo(s) seleccionado(s)`}
                </span>
                {menuAbierto ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
              </button>

              {menuAbierto && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-2 space-y-1">
                    {OPCIONES_CAMBIO.map((opcion) => {
                      const marcada = motivosSeleccionados.includes(opcion);
                      return (
                        <div
                          key={opcion}
                          onClick={() => alternarMotivo(opcion)}
                          className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer text-xs sm:text-sm transition-colors ${
                            marcada ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                            marcada ? 'bg-blue-900 border-blue-900 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {marcada && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span>{opcion}</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => setMenuAbierto(false)} 
                        className="text-xs font-bold text-blue-900 hover:text-blue-950 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Listo / Cerrar
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Chips de opciones seleccionadas */}
              {motivosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {motivosSeleccionados.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 text-xs px-2.5 py-1 rounded-md font-medium">
                      <span className="truncate max-w-[200px]">{m}</span>
                      <button type="button" onClick={() => alternarMotivo(m)} className="hover:text-red-600">
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recuadro de comentarios / detalles SIEMPRE VISIBLE Y OBLIGATORIO */}
            <div>
              <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">
                Explicación o comentarios detallados <span className="text-red-500">*</span>
              </label>
              <textarea 
                required 
                rows={4} 
                placeholder="Describa detalladamente los motivos y antecedentes que fundamentan esta solicitud de cambio..." 
                value={motivoDetalle} 
                onChange={(e) => setMotivoDetalle(e.target.value)} 
                disabled={cargando} 
                className="w-full border border-gray-300 rounded-lg p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none resize-none transition-all bg-gray-50 focus:bg-white"
              />
              <p className="text-xs text-gray-400 mt-1 font-medium">Este campo es obligatorio y formará parte del expediente del traslado.</p>
            </div>

            {mensaje?.tipo === 'error' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200 text-center flex items-center justify-center gap-2">
                <span>❌</span> {mensaje.texto}
              </div>
            )}

            <button 
              type="submit" 
              disabled={!puedeEnviar} 
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {cargando ? 'Procesando traslado oficial...' : 'Confirmar y Efectuar Traslado'}
            </button>

            {!puedeEnviar && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center font-medium">
                ⚠️ Para enviar, debe ingresar el RUT, seleccionar al menos un motivo y redactar la explicación detallada.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
