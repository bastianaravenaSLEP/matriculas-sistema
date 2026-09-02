import React, { useState } from 'react';

export const useVerificador = () => {
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

  return {
    rut, setRut,
    codigo, setCodigo,
    cargando,
    error,
    manejarVerificacion
  };
};