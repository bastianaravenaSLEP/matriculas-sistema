import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rol, setRol] = useState('COLEGIO');
  const [cargando, setCargando] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rol })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.detail || 'Error al iniciar sesión');

      localStorage.setItem('token', datos.access_token);
      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: credentialResponse.credential, 
          rol: rol 
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.detail || 'Error al iniciar sesión con Google');

      localStorage.setItem('token', datos.access_token);
      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    error, setError,
    rol, setRol,
    cargando,
    handleLogin,
    handleGoogleSuccess
  };
};