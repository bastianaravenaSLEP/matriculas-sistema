import React, { useState } from 'react';
import { ShieldCheck, Search, FileX } from 'lucide-react';

export default function Verificador() {
  const [rut, setRut] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarVerificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      // Como es público, no enviamos token de Authorization
      const respuesta = await fetch(`http://127.0.0.1:8000/documentos/verificar?rut=${rut}&codigo=${codigo}`);
      
      if (!respuesta.ok) {
        const data = await respuesta.json();
        throw new Error(data.detail || 'Ocurrió un error al verificar el documento.');
      }

      // Si es exitoso, el backend nos devuelve el PDF en crudo. Lo abrimos.
      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-950 p-6 text-center border-b-4 border-red-600">
          <ShieldCheck className="mx-auto text-emerald-400 mb-3" size={48} />
          <h2 className="text-xl font-bold text-white">Validación de Certificados</h2>
          <p className="text-blue-200 text-sm mt-1">Servicio Local de Educación Pública</p>
        </div>

        <div className="p-8">
          <p className="text-gray-600 text-sm mb-6 text-center">
            Ingrese los datos ubicados en el pie de página del certificado impreso o digital para comprobar su autenticidad institucional.
          </p>

          <form onSubmit={manejarVerificacion} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">RUT del Estudiante</label>
              <input 
                type="text" 
                placeholder="Ej: 25261940-2" 
                value={rut} 
                onChange={(e) => setRut(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none uppercase" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Código de Verificación Único</label>
              <input 
                type="text" 
                placeholder="Ej: VLP-152-A9F2B4" 
                value={codigo} 
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-900 outline-none uppercase tracking-widest" 
                required 
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                <FileX size={20} className="shrink-0 mt-0.5" />
                <p><strong>Fallo en la validación:</strong> {error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={cargando}
              className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {cargando ? 'Consultando Registro...' : <><Search size={18} /> Verificar Documento</>}
            </button>
          </form>
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t border-gray-100">
          Plataforma Oficial del Registro General de Matrículas (RGM)
        </div>
      </div>
    </div>
  );
}