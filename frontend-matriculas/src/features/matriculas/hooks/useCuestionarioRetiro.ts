import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export const useCuestionarioRetiro = () => {
  const { id } = useParams(); 
  
  const [rutEstudiante, setRutEstudiante] = useState('');
  const [motivoPrincipal, setMotivoPrincipal] = useState('');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [estado, setEstado] = useState<'formulario' | 'cargando' | 'exito' | 'error'>('formulario');
  const [mensajeError, setMensajeError] = useState('');

  const enviarCuestionario = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado('cargando');
    
    // 🌟 UNIMOS EL DESPLEGABLE CON EL TEXTO LIBRE PARA GUARDARLO ORDENADO
    const textoConsolidado = `[Motivo Principal]: ${motivoPrincipal}\n[Detalles Adicionales]: ${motivoDetalle.trim() || 'Sin comentarios adicionales.'}`;

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${id}/cuestionario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rut_estudiante: rutEstudiante, 
          motivo_real: textoConsolidado 
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

  return {
    rutEstudiante, setRutEstudiante,
    motivoPrincipal, setMotivoPrincipal,
    motivoDetalle, setMotivoDetalle,
    estado,
    mensajeError,
    enviarCuestionario
  };
};