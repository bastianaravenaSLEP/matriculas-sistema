import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/api';

export const useVerificador = () => {
  const [searchParams] = useSearchParams();
  const [rut, setRut] = useState(searchParams.get('rut') || '');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rutParam = searchParams.get('rut');
    const codigoParam = searchParams.get('codigo');
    if (rutParam && codigoParam) {
      ejecutarVerificacion(rutParam, codigoParam);
    }
  }, []);

  const ejecutarVerificacion = async (rutVal: string, codigoVal: string) => {
    setCargando(true);
    setError(null);

    try {
      // Como es público, no enviamos token de Authorization
      const respuesta = await fetch(`${API_BASE_URL}/documentos/verificar?rut=${encodeURIComponent(rutVal)}&codigo=${encodeURIComponent(codigoVal)}`);
      
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

  const manejarVerificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    await ejecutarVerificacion(rut, codigo);
  };

  return {
    rut, setRut,
    codigo, setCodigo,
    cargando,
    error,
    manejarVerificacion
  };
};