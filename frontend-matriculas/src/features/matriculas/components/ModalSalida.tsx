import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ModalSalidaProps {
  isOpen: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export const ModalSalida: React.FC<ModalSalidaProps> = ({
  isOpen,
  onCancelar,
  onConfirmar,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-amber-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-2 bg-amber-100 rounded-full">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-black text-gray-900">¿Desea salir del registro?</h3>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Hay un proceso de matrícula en curso. Si cambia de módulo ahora,{' '}
          <strong>deberá realizar todo el proceso de nuevo y su progreso se perderá</strong>.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancelar}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
          >
            Continuar aquí
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md"
          >
            Sí, salir
          </button>
        </div>
      </div>
    </div>
  );
};
