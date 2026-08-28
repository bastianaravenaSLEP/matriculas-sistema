import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function EncuestaCambioCurso() {
  const { id } = useParams<{ id: string }>();
  
  const [rutEstudiante, setRutEstudiante] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${id}/cuestionario-curso`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rut_estudiante: rutEstudiante,
          motivo_real: motivo
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.detail || 'Ocurrió un error al guardar el motivo.');
      }

      setMensaje({ texto: 'Formulario enviado con éxito. Puede cerrar esta pestaña.', tipo: 'exito' });
      setRutEstudiante('');
      setMotivo('');
    } catch (error: any) {
      setMensaje({ texto: error.message, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    /* 🌟 Fondeo más oscuro (slate-200) para crear contraste real con la tarjeta blanca */
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4 sm:p-8">
      
      {/* 🌟 Tarjeta con sombra profunda (shadow-2xl) y bordes redondeados */}
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden border border-gray-200">
        
        {/* 🌟 Franja superior institucional (Azul y Rojo SLEP) */}
        <div className="absolute top-0 left-0 w-full h-2 flex">
          <div className="w-1/2 bg-blue-700"></div>
          <div className="w-1/2 bg-red-600"></div>
        </div>

        <div className="text-center mb-8 mt-2">
          {/* 🌟 Logo más grande (h-20 a h-24) */}
          <img 
            src="/images/logo-slep.negro.png" 
            alt="Logo SLEP" 
            className="h-24 mx-auto mb-5 object-contain" 
          />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
            Justificación de Traslado
          </h2>
          <p className="text-sm text-gray-500 mt-3 font-medium">
            Por normativa institucional, indique el motivo por el cual solicitó el cambio de curso interno.
          </p>
        </div>

        {mensaje?.tipo === 'exito' ? (
          <div className="bg-emerald-50 text-emerald-800 p-6 rounded-xl text-center border border-emerald-200 shadow-inner">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-lg">{mensaje.texto}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">
                RUT del Estudiante <span className="text-xs text-gray-400 normal-case font-medium">(Sin puntos, con guion)</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Ej: 20123456-7"
                value={rutEstudiante}
                onChange={(e) => setRutEstudiante(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wide">
                Motivo del traslado
              </label>
              <textarea 
                required 
                rows={4}
                placeholder="Explique brevemente las razones (ej: cercanía, solicitud del apoderado...)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none resize-none transition-all bg-gray-50 focus:bg-white"
              />
            </div>

            {mensaje?.tipo === 'error' && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200 text-center flex items-center justify-center gap-2">
                <span>❌</span> {mensaje.texto}
              </div>
            )}

            <button 
              type="submit" 
              disabled={cargando || !rutEstudiante || !motivo}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {cargando ? 'Procesando envío...' : 'Confirmar Justificación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}