import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export const useCuestionarioCambio = () => {
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

  return {
    rutEstudiante, setRutEstudiante,
    motivo, setMotivo,
    cargando,
    mensaje,
    handleSubmit
  };
};