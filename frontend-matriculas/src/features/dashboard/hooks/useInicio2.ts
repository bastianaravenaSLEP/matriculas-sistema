import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

export const useInicio2 = () => {
  const [estadisticas, setEstadisticas] = useState({
    anios_disponibles: [] as number[],
    total_activos: 0,
    total_inactivos: 0,
    por_nivel: [],
    por_curso: []
  });
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setCargando(true); 

    let url = `http://127.0.0.1:8000/dashboard/estadisticas?`;
    const params = new URLSearchParams();
    if (colegioSeleccionado) params.append('establecimiento_id', colegioSeleccionado);
    if (anioSeleccionado) params.append('anio', anioSeleccionado);
    
    url += params.toString();

    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })
      .then(res => {
        if (res.status === 401) throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        if (!res.ok) throw new Error('Error al cargar métricas');
        return res.json();
      })
      .then(data => {
        setEstadisticas(data);
        setCargando(false);
      })
      .catch(err => {
        setError(err.message);
        setCargando(false);
      });
  }, [colegioSeleccionado, anioSeleccionado]); 

  return {
    estadisticas,
    cargando,
    error,
    anioSeleccionado,
    setAnioSeleccionado
  };
};