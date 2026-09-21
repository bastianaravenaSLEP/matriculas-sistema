import { useState, useEffect } from 'react';

export const usePortalFirmaApoderado = () => {
  const [pasoActual, setPasoActual] = useState(1);
  const [firmado, setFirmado] = useState(false);
  
  // 🌟 Estado para almacenar los datos que vienen desde NuevaMatricula
  const [datosAlumno, setDatosAlumno] = useState<any>(null);

  const [respuestas, setRespuestas] = useState({
    religion: '',
    compromiso: false,
    entrevista: false,
    imagen: false
  });

  // 🌟 Al cargar la página, leemos la memoria local
  useEffect(() => {
    const guardados = localStorage.getItem('datosPruebaFirma');
    if (guardados) {
      setDatosAlumno(JSON.parse(guardados));
    }
  }, []);

  const irSiguiente = () => setPasoActual(prev => Math.min(prev + 1, 5));
  const irAtras = () => setPasoActual(prev => Math.max(prev - 1, 1));

  const firmarClaveUnica = () => {
    setFirmado(true);
  };

  return {
    pasoActual,
    firmado,
    respuestas,
    setRespuestas,
    irSiguiente,
    irAtras,
    firmarClaveUnica,
    datosAlumno
  };
};