import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function CuestionarioRetiro() {
  // Capturamos el ID de la matrícula directamente desde la URL (Ej: /encuesta-retiro/5)
  const { id } = useParams(); 
  
  const [rutEstudiante, setRutEstudiante] = useState('');
  const [motivo, setMotivo] = useState('');
  const [estado, setEstado] = useState<'formulario' | 'cargando' | 'exito' | 'error'>('formulario');
  const [mensajeError, setMensajeError] = useState('');

  const enviarCuestionario = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado('cargando');
    
    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${id}/cuestionario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rut_estudiante: rutEstudiante, 
          motivo_real: motivo 
        }),
      });

      if (!respuesta.ok) {
        const err = await respuesta.json();
        throw new Error(err.detail || 'Error de conexión con el servidor.');
      }
      
      setEstado('exito');
    } catch (err: any) {
      setMensajeError(err.message);
      setEstado('error');
    }
  };

  // VISTA 1: ÉXITO (Lo que ve el apoderado al terminar)
  if (estado === 'exito') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border-t-4 border-green-500">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Formulario Recibido</h2>
          <p className="text-gray-600">
            Sus respuestas han sido registradas de forma segura y confidencial en el sistema RGM. 
            Muchas gracias por su tiempo.
          </p>
        </div>
      </div>
    );
  }

  // VISTA 2: FORMULARIO, ERROR Y CARGA
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border-t-4 border-blue-600">
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cuestionario de Retiro</h2>
        <p className="text-sm text-gray-600 mb-6">
          Por normativa del SLEP, solicitamos nos indique los motivos del retiro. Esta información es estrictamente confidencial.
        </p>
        
        {estado === 'error' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <p className="text-red-700 text-sm font-medium">{mensajeError}</p>
            <button 
              onClick={() => setEstado('formulario')} 
              className="text-red-700 font-bold text-xs mt-2 hover:underline focus:outline-none"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {estado === 'formulario' && (
          <form onSubmit={enviarCuestionario} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medida de Seguridad
              </label>
              <input 
                required 
                type="text" 
                placeholder="Ingrese el RUT del estudiante (Ej: 21123456-7)"
                value={rutEstudiante} 
                onChange={(e) => setRutEstudiante(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo principal del retiro
              </label>
              <textarea 
                required 
                rows={4} 
                placeholder="Por favor, detalle brevemente los motivos de la baja..."
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm"
            >
              Enviar Respuestas
            </button>
          </form>
        )}
        
        {estado === 'cargando' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Enviando información segura...</p>
          </div>
        )}
        
      </div>
    </div>
  );
}