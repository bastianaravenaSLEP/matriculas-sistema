import React, { useState, useEffect } from 'react';
import { FileText, Mail, X, CheckCircle, Send, Download, Eye } from 'lucide-react';

interface ModalEmisionProps {
  isOpen: boolean;
  onClose: () => void;
  idMatricula: number;
  nombreAlumno: string;
  emailApoderado?: string; // Solo recibimos este para pre-rellenar si existe
  tipoDocumento: 'MATRICULA' | 'RETIRO' | 'CAMBIO_CURSO';
}

export default function ModalEmisionDocumento({
  isOpen, onClose, idMatricula, nombreAlumno, emailApoderado, tipoDocumento
}: ModalEmisionProps) {
  
  const [enviarDirector, setEnviarDirector] = useState(false);
  const [correoDirector, setCorreoDirector] = useState('');

  const [enviarApoderado, setEnviarApoderado] = useState(false);
  const [correoApoderado, setCorreoApoderado] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mostrarVisor, setMostrarVisor] = useState(false);

  // Al abrir el modal, pre-rellenamos el correo del apoderado si viene de la base de datos
  useEffect(() => {
    if (emailApoderado) {
      setCorreoApoderado(emailApoderado);
    }
  }, [emailApoderado]);

  if (!isOpen) return null;

  const getTitulo = () => {
    switch (tipoDocumento) {
      case 'MATRICULA': return 'Emitir Certificado de Matrícula';
      case 'RETIRO': return 'Emitir Comprobante de Retiro';
      case 'CAMBIO_CURSO': return 'Emitir Certificado de Cambio';
    }
  };

  const handleEnviarCorreos = async () => {
    // Recopilar los correos que estén chequeados y no estén vacíos
    const destinatarios: string[] = [];
    if (enviarDirector && correoDirector.trim() !== '') destinatarios.push(correoDirector.trim());
    if (enviarApoderado && correoApoderado.trim() !== '') destinatarios.push(correoApoderado.trim());

    if (destinatarios.length === 0) {
      alert('Debe ingresar y marcar al menos un correo electrónico para realizar el envío.');
      return;
    }

    setCargando(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('http://127.0.0.1:8000/documentos/emitir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_matricula: idMatricula,
          tipo_documento: tipoDocumento,
          destinatarios: destinatarios // Enviamos el array limpio al backend
        })
      });

      if (!res.ok) throw new Error('Error al enviar los documentos por correo');
      
      const data = await res.json();
      setMensajeExito(data.message);
      
      setTimeout(() => {
        setMensajeExito('');
        onClose();
      }, 2500);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarLocal = () => {
window.open(`http://127.0.0.1:8000/matriculas/${idMatricula}/certificado?tipo=${tipoDocumento}`, '_blank');  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <h2 className="font-bold">{getTitulo()}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5">
          {mensajeExito ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <p className="font-bold text-gray-800 text-lg">{mensajeExito}</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium flex justify-between items-center">
                <div>
                  <p className="text-xs text-blue-600 uppercase font-bold">Estudiante</p>
                  <p className="font-bold">{nombreAlumno}</p>
                </div>
                <button 
                  onClick={() => setMostrarVisor(true)}
                  className="bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Eye size={14} /> Ver PDF
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                  <Mail size={16} /> Enviar Comprobante por Correo
                </h3>
                
                {/* BLOQUE DIRECTOR */}
                <div className={`p-3 border rounded-lg transition-colors ${enviarDirector ? 'bg-gray-50 border-blue-300' : 'hover:bg-gray-50'}`}>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input type="checkbox" checked={enviarDirector} onChange={(e) => setEnviarDirector(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                    <p className="text-sm font-bold text-gray-800">Enviar a un Director / Institución</p>
                  </label>
                  {enviarDirector && (
                    <input 
                      type="email" 
                      placeholder="Ingrese el correo del director..." 
                      value={correoDirector}
                      onChange={(e) => setCorreoDirector(e.target.value)}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* BLOQUE APODERADO */}
                <div className={`p-3 border rounded-lg transition-colors ${enviarApoderado ? 'bg-gray-50 border-blue-300' : 'hover:bg-gray-50'}`}>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input type="checkbox" checked={enviarApoderado} onChange={(e) => setEnviarApoderado(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">Enviar a un Apoderado</p>
                      {!enviarApoderado && emailApoderado && <p className="text-xs text-gray-500">Sugerencia BD: {emailApoderado}</p>}
                    </div>
                  </label>
                  {enviarApoderado && (
                    <input 
                      type="email" 
                      placeholder="Ingrese el correo del apoderado..." 
                      value={correoApoderado}
                      onChange={(e) => setCorreoApoderado(e.target.value)}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t mt-4">
                <button 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors text-sm"
                  onClick={handleDescargarLocal}
                >
                  <Download size={16} /> Descargar PDF
                </button>
                <button 
                  onClick={handleEnviarCorreos}
                  disabled={cargando || (!enviarDirector && !enviarApoderado)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {cargando ? 'Enviando...' : <><Send size={16} /> Enviar Correos</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {mostrarVisor && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800">Vista Previa del Certificado Oficial</h3>
              <button onClick={() => setMostrarVisor(false)} className="px-4 py-1.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-bold transition-colors">
                Cerrar Visor
              </button>
            </div>
            <div className="flex-1 bg-gray-200 p-2">
              <iframe src={`http://127.0.0.1:8000/matriculas/${idMatricula}/certificado?tipo=${tipoDocumento}`} 
                className="w-full h-full rounded shadow-sm bg-white" 
                title="Visor PDF Oficial"/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}