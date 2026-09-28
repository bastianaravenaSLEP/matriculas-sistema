import React from 'react';
import { CheckCircle, Mail, Download, ArrowRight } from 'lucide-react';

interface ModalExitoProps {
  isOpen: boolean;
  metodoFirma: string;
  generarComprobantePDF: () => void;
  onVolver: () => void;
}

export const ModalExito: React.FC<ModalExitoProps> = ({
  isOpen,
  metodoFirma,
  generarComprobantePDF,
  onVolver,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#25306B] p-6 text-center">
          <CheckCircle className="mx-auto text-emerald-400 mb-3" size={48} />
          <h3 className="text-xl font-bold text-white">
            {metodoFirma === 'Digital' ? '¡Solicitud de Firma Enviada!' : '¡Matrícula Registrada!'}
          </h3>
          <p className="text-blue-200 text-sm mt-1">
            {metodoFirma === 'Digital'
              ? 'El estudiante fue ingresado y queda a la espera de la firma del apoderado.'
              : 'El estudiante ha sido ingresado exitosamente.'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {metodoFirma === 'Digital' ? (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
              <Mail className="mx-auto text-blue-600 mb-2" size={24} />
              <p className="text-sm font-bold text-blue-900">Solicitud de Firma Enviada</p>
              <p className="text-xs text-blue-700 mt-1">
                La matrícula queda en estado <span className="font-bold">Pendiente de Firma</span> hasta que el apoderado lea, responda religión/autorizaciones y firme con su Clave Única.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={generarComprobantePDF}
              className="w-full flex flex-col items-center justify-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 py-4 rounded-lg font-bold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Download size={20} /> Descargar Set de Documentos (PDF)
              </span>
              <span className="text-[10px] font-normal text-orange-600">
                Imprima este archivo para la firma presencial del apoderado.
              </span>
            </button>
          )}

          <div className="border-t border-gray-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onVolver}
              className="w-full flex items-center justify-center gap-2 bg-[#006BB9] hover:bg-[#25306B] text-white py-3 rounded-lg font-bold transition-colors shadow-md"
            >
              Volver al inicio <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
