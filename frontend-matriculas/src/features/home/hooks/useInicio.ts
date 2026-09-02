import { useState, useEffect } from 'react';

export const useInicio = () => {
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const usuarioString = localStorage.getItem('usuario');
    if (usuarioString) {
      setUsuario(JSON.parse(usuarioString));
    }
  }, []);

  const puedeVerAuditoria = !['Colegio', 'Visualizador_Colegio'].includes(usuario?.rol);

  return {
    usuario,
    puedeVerAuditoria
  };
};